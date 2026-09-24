using API.DTOs;
using API.Entities;
using API.Interfaces;
using NetTopologySuite.Geometries;
using Route = API.Entities.Route;

namespace API.Services;

public class RouteService : IRouteService
{
    private const int MaxRoutes = 4;

    public List<Route> GetShortestPath(IReadOnlyList<Edge> navigableEdges, IEnumerable<Node> fromEntrances, IEnumerable<Node> toEntrances)
    {
        var routes = new List<Route>();
        var graph = BuildAdjacency(navigableEdges);

        var candidatePaths = new List<(decimal Weight, int FromId, int ToId, List<Node> Path)>();

        foreach (var from in fromEntrances)
        {
            var (distances, previous) = Dijkstra(graph, from.NodeId);

            foreach (var to in toEntrances)
            {
                if (!distances.TryGetValue(to.NodeId, out var distance)) continue;

                var path = ReconstructPath(previous, from.NodeId, to.NodeId, navigableEdges);
                if (path is null) continue;

                candidatePaths.Add((distance, from.NodeId, to.NodeId, path));
            }
        }

        candidatePaths = candidatePaths.OrderBy(c => c.Weight).ToList();

        var seenGeometries = new HashSet<string>();

        foreach (var candidate in candidatePaths)
        {
            if (routes.Count >= MaxRoutes) break;

            var lineString = BuildLineString(candidate.Path);
            var geoKey = lineString.ToText();

            if (seenGeometries.Add(geoKey))
            {
                routes.Add(new Route
                {
                    Path = lineString,
                    FromNodeId = candidate.FromId,
                    ToNodeId = candidate.ToId,
                    Weight = candidate.Weight,
                    RouteGuides = []
                });
            }
        }

        return routes;
    }

    public List<Route> GetMultiLegPath(IReadOnlyList<Edge> drivingEdges, IReadOnlyList<Edge> walkingEdges,
        IEnumerable<Node> originEntrances, IEnumerable<Node> destinationEntrances, IEnumerable<Node> parkingAccessNodes)
    {
        if (!parkingAccessNodes.Any())
            return [];

        var vehicularLeg = GetShortestPath(drivingEdges, originEntrances, parkingAccessNodes);
        if (!vehicularLeg.Any()) return [];

        var walkingLeg = GetShortestPath(walkingEdges, parkingAccessNodes, destinationEntrances);
        if (!walkingLeg.Any()) return [];

        var multiLegRoutes = new List<Route>();

        foreach (var vLeg in vehicularLeg)
        {
            var matchingWalkLeg = walkingLeg.FirstOrDefault(w => w.FromNodeId == vLeg.ToNodeId);
            if (matchingWalkLeg == null) continue;

            var vCoords = vLeg.Path.Coordinates;
            var wCoords = matchingWalkLeg.Path.Coordinates;
            var combinedCoords = vCoords.Concat(wCoords.Skip(1)).ToArray();

            multiLegRoutes.Add(new Route
            {
                Path = new LineString(combinedCoords),
                FromNodeId = vLeg.FromNodeId,
                ToNodeId = matchingWalkLeg.ToNodeId,
                Weight = vLeg.Weight + matchingWalkLeg.Weight,
                RouteGuides = []
            });

            if (multiLegRoutes.Count >= MaxRoutes) break;
        }

        return multiLegRoutes;
    }

    public List<RouteGuideDto> GetRouteGuides(Route route)
    {
        var guides = new List<RouteGuideDto>();
        if (route?.Path?.Coordinates is null || route.Path.Coordinates.Length < 2)
            return guides;

        var coords = route.Path.Coordinates;
        int stepIndex = 0;

        guides.Add(new RouteGuideDto
        {
            StepIndex = stepIndex++,
            Location = new Point(coords[0]) { SRID = 4326 },
            Instruction = route.TravelMode switch
            {
                TravelMode.Car => "Start driving towards your destination parking area",
                TravelMode.Bus => "Board the bus towards your destination parking area",
                _ => "Start walking towards your destination"
            }
        });

        for (int i = 1; i < coords.Length - 1; i++)
        {
            var prevCoord = coords[i - 1];
            var currentCoord = coords[i];

            double incomingBearing = CalculateBearing(prevCoord, currentCoord);
            double outgoingBearing = CalculateBearing(currentCoord, coords[i + 1]);
            double angleChange = GetAngularDifference(incomingBearing, outgoingBearing);

            string instruction = ClassifyTurnInstruction(angleChange);

            if (instruction != "Continue straight" && !instruction.Contains("Slight"))
            {
                var previousGuide = guides[^1];
                previousGuide.Instruction = previousGuide.Instruction.StartsWith("Start")
                    ? $"{previousGuide.Instruction}. {instruction} ahead"
                    : $"{instruction} ahead";
            }

            guides.Add(new RouteGuideDto
            {
                StepIndex = stepIndex++,
                Location = new Point(currentCoord) { SRID = 4326 },
                Instruction = instruction
            });
        }

        guides.Add(new RouteGuideDto
        {
            StepIndex = stepIndex,
            Location = new Point(coords[^1]) { SRID = 4326 },
            Instruction = "Proceed to the entrance. You have arrived at your destination"
        });

        return guides;
    }

    #region Private Helper Methods
    private static string ClassifyTurnInstruction(double angleChange)
    {
        if (Math.Abs(angleChange) < 20.0)
            return "Continue straight";

        if (angleChange >= 20.0 && angleChange < 45.0)
            return "Slight right";

        if (angleChange >= 45.0 && angleChange < 135.0)
            return "Turn right";

        if (angleChange <= -20.0 && angleChange > -45.0)
            return "Slight left";

        if (angleChange <= -45.0 && angleChange > -135.0)
            return "Turn left";

        return "Make a U-turn";
    }

    private double CalculateBearing(Coordinate start, Coordinate end)
    {
        double lat1 = DegreesToRadians(start.Y);
        double lon1 = DegreesToRadians(start.X);
        double lat2 = DegreesToRadians(end.Y);
        double lon2 = DegreesToRadians(end.X);

        double dLon = lon2 - lon1;

        double y = Math.Sin(dLon) * Math.Cos(lat2);
        double x = Math.Cos(lat1) * Math.Sin(lat2) - Math.Sin(lat1) * Math.Cos(lat2) * Math.Cos(dLon);

        double bearing = RadiansToDegrees(Math.Atan2(y, x));
        return (bearing + 360) % 360;
    }

    private double GetAngularDifference(double fromBearing, double toBearing)
    {
        double diff = (toBearing - fromBearing + 180) % 360 - 180;
        return diff < -180 ? diff + 360 : diff;
    }

    private static double DegreesToRadians(double deg) => deg * (Math.PI / 180.0);
    private static double RadiansToDegrees(double rad) => rad * (180.0 / Math.PI);

    private static Dictionary<int, List<(int NeighborId, decimal Weight)>> BuildAdjacency(IReadOnlyList<Edge> edges)
    {
        var graph = new Dictionary<int, List<(int, decimal)>>();

        void AddDirected(int fromId, int toId, decimal weight)
        {
            if (!graph.TryGetValue(fromId, out var list))
                graph[fromId] = list = [];
            list.Add((toId, weight));
        }

        foreach (var edge in edges)
        {
            AddDirected(edge.FromNodeId, edge.ToNodeId, edge.Weight);
            AddDirected(edge.ToNodeId, edge.FromNodeId, edge.Weight);
        }

        return graph;
    }

    private static (Dictionary<int, decimal> distances, Dictionary<int, int> previous) Dijkstra(
        Dictionary<int, List<(int NeighborId, decimal Weight)>> graph, int sourceId)
    {
        var distances = new Dictionary<int, decimal> { [sourceId] = 0 };
        var previous = new Dictionary<int, int>();
        var visited = new HashSet<int>();
        var queue = new PriorityQueue<int, decimal>();
        queue.Enqueue(sourceId, 0);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            if (!visited.Add(current)) continue;

            if (!graph.TryGetValue(current, out var neighbors)) continue;

            foreach (var (neighborId, weight) in neighbors)
            {
                var newDist = distances[current] + weight;
                if (!distances.TryGetValue(neighborId, out var existing) || newDist < existing)
                {
                    distances[neighborId] = newDist;
                    previous[neighborId] = current;
                    queue.Enqueue(neighborId, newDist);
                }
            }
        }

        return (distances, previous);
    }

    private static List<Node>? ReconstructPath(Dictionary<int, int> previous, int fromId, int toId, IReadOnlyList<Edge> edges)
    {
        var nodesById = BuildNodeLookup(edges);

        if (!nodesById.ContainsKey(toId)) return null;

        var path = new List<Node> { nodesById[toId] };
        var currentId = toId;

        while (currentId != fromId)
        {
            if (!previous.TryGetValue(currentId, out var prevId)) return null;
            path.Add(nodesById[prevId]);
            currentId = prevId;
        }

        path.Reverse();
        return path;
    }

    private static Dictionary<int, Node> BuildNodeLookup(IReadOnlyList<Edge> edges)
    {
        var lookup = new Dictionary<int, Node>();

        foreach (var edge in edges)
        {
            lookup.TryAdd(edge.FromNodeId, edge.FromNode);
            lookup.TryAdd(edge.ToNodeId, edge.ToNode);
        }

        return lookup;
    }

    private static LineString BuildLineString(List<Node> path) =>
        new(path.Select(n => new Coordinate(n.Location.X, n.Location.Y)).ToArray());

    #endregion
}