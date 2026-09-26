using API.DTOs;
using API.Entities;
using API.Helpers;
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

    public List<Route> GetShortestPathFromLocation(IReadOnlyList<Edge> navigableEdges, Point origin,
        IEnumerable<Node> destinationEntrances)
    {
        const int originNodeId = int.MinValue;
        const int snapNodeId = int.MinValue + 1;
        const double maxSnapDistanceMeters = 75;

        var nearestEdge = navigableEdges
            .Select(edge => (Edge: edge, Projection: ProjectOntoEdge(origin, edge)))
            .Where(candidate => candidate.Projection.DistanceMeters <= maxSnapDistanceMeters)
            .OrderBy(candidate => candidate.Projection.DistanceMeters)
            .FirstOrDefault();

        if (nearestEdge.Edge is null)
            return [];

        var originNode = new Node
        {
            NodeId = originNodeId,
            CampusId = nearestEdge.Edge.CampusId,
            Location = origin
        };
        var snapNode = new Node
        {
            NodeId = snapNodeId,
            CampusId = nearestEdge.Edge.CampusId,
            Location = nearestEdge.Projection.Location
        };

        var edges = navigableEdges.ToList();
        edges.Add(CreateTemporaryEdge(originNode, snapNode, (decimal)nearestEdge.Projection.DistanceMeters,
            nearestEdge.Edge));
        edges.Add(CreateTemporaryEdge(snapNode, nearestEdge.Edge.FromNode,
            nearestEdge.Edge.Weight * (decimal)nearestEdge.Projection.Fraction, nearestEdge.Edge));
        edges.Add(CreateTemporaryEdge(snapNode, nearestEdge.Edge.ToNode,
            nearestEdge.Edge.Weight * (decimal)(1 - nearestEdge.Projection.Fraction), nearestEdge.Edge));

        return GetShortestPath(edges, [originNode], destinationEntrances);
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
            var matchingWalkLeg = walkingLeg.OrderBy(w => w.Weight).FirstOrDefault();
            if (matchingWalkLeg == null) continue;

            var vehicleParkingNode = parkingAccessNodes.FirstOrDefault(n => n.NodeId == vLeg.ToNodeId);
            var walkingParkingNode = parkingAccessNodes.FirstOrDefault(n => n.NodeId == matchingWalkLeg.FromNodeId);
            if (vehicleParkingNode is null || walkingParkingNode is null) continue;

            var vCoords = vLeg.Path.Coordinates;
            var wCoords = matchingWalkLeg.Path.Coordinates;
            var parkingConnection = vehicleParkingNode.NodeId == walkingParkingNode.NodeId
                ? Array.Empty<Coordinate>()
                : [wCoords[0]];
            var parkingConnectionWeight = vehicleParkingNode.NodeId == walkingParkingNode.NodeId
                ? 0
                : (decimal)GeoHelper.DegreeDistanceToMeters(
                    vehicleParkingNode.Location.Distance(walkingParkingNode.Location),
                    walkingParkingNode.Location.Y);
            var combinedCoords = vCoords.Concat(parkingConnection).Concat(wCoords.Skip(1)).ToArray();

            multiLegRoutes.Add(new Route
            {
                Path = new LineString(combinedCoords),
                FromNodeId = vLeg.FromNodeId,
                ToNodeId = matchingWalkLeg.ToNodeId,
                Weight = vLeg.Weight + parkingConnectionWeight + matchingWalkLeg.Weight,
                TransitionNodeId = walkingParkingNode.NodeId,
                TransitionParkingAreaId = walkingParkingNode.ParkingAreaId,
                TransitionLocation = new Point(wCoords[0]) { SRID = 4326 },
                RouteGuides = []
            });

            if (multiLegRoutes.Count >= MaxRoutes) break;
        }

        return multiLegRoutes;
    }

    public List<Route> GetParkingOriginPath(IReadOnlyList<Edge> drivingEdges, IReadOnlyList<Edge> walkingEdges,
        IEnumerable<Node> originParkingNodes, IEnumerable<Node> destinationEntrances,
        IEnumerable<Node> parkingAccessNodes)
    {
        var originNodes = originParkingNodes.ToList();
        var destinationNodes = destinationEntrances.ToList();
        var parkingNodes = parkingAccessNodes.ToList();
        if (!originNodes.Any() || !parkingNodes.Any() || !destinationNodes.Any()) return [];

        var originParkingAreaId = originNodes
            .Select(n => n.ParkingAreaId)
            .FirstOrDefault(id => id is not null);
        var destinationParkingAreaId = parkingNodes
            .Select(n => n.ParkingAreaId)
            .FirstOrDefault(id => id is not null);

        if (originParkingAreaId is not null && originParkingAreaId == destinationParkingAreaId)
        {
            var walkingRoutes = GetShortestPath(walkingEdges, originNodes, destinationNodes);

            return walkingRoutes.Select(route =>
            {
                var originNode = originNodes.First(n => n.NodeId == route.FromNodeId);
                route.OriginParkingNodeId = originNode.NodeId;
                route.OriginParkingAreaId = originNode.ParkingAreaId;
                route.OriginParkingLocation = new Point(route.Path.Coordinates[0]) { SRID = 4326 };
                return route;
            }).ToList();
        }

        var vehicularLegs = GetShortestPath(drivingEdges, originNodes, parkingNodes);
        var walkingLegs = GetShortestPath(walkingEdges, parkingNodes, destinationNodes);
        var routes = new List<Route>();

        foreach (var vehicleLeg in vehicularLegs)
        {
            // The best walking access point can differ from the access point used by the vehicle leg.
            var walkingLeg = walkingLegs.OrderBy(w => w.Weight).FirstOrDefault();
            if (walkingLeg is null) continue;

            var originNode = originNodes.FirstOrDefault(n => n.NodeId == vehicleLeg.FromNodeId);
            var vehicleParkingNode = parkingNodes.FirstOrDefault(n => n.NodeId == vehicleLeg.ToNodeId);
            var walkingParkingNode = parkingNodes.FirstOrDefault(n => n.NodeId == walkingLeg.FromNodeId);
            if (originNode is null || vehicleParkingNode is null || walkingParkingNode is null) continue;

            var vehicleCoords = vehicleLeg.Path.Coordinates;
            var walkingCoords = walkingLeg.Path.Coordinates;
            var parkingConnection = vehicleParkingNode.NodeId == walkingParkingNode.NodeId
                ? Array.Empty<Coordinate>()
                : [walkingCoords[0]];
            var parkingConnectionWeight = vehicleParkingNode.NodeId == walkingParkingNode.NodeId
                ? 0
                : (decimal)GeoHelper.DegreeDistanceToMeters(
                    vehicleParkingNode.Location.Distance(walkingParkingNode.Location),
                    walkingParkingNode.Location.Y);

            routes.Add(new Route
            {
                Path = new LineString(vehicleCoords.Concat(parkingConnection).Concat(walkingCoords.Skip(1)).ToArray()),
                FromNodeId = vehicleLeg.FromNodeId,
                ToNodeId = walkingLeg.ToNodeId,
                Weight = vehicleLeg.Weight + parkingConnectionWeight + walkingLeg.Weight,
                OriginParkingNodeId = originNode.NodeId,
                OriginParkingAreaId = originNode.ParkingAreaId,
                OriginParkingLocation = new Point(vehicleCoords[0]) { SRID = 4326 },
                TransitionNodeId = walkingParkingNode.NodeId,
                TransitionParkingAreaId = walkingParkingNode.ParkingAreaId,
                TransitionLocation = new Point(walkingCoords[0]) { SRID = 4326 },
                RouteGuides = []
            });

            if (routes.Count >= MaxRoutes) break;
        }

        return routes;
    }

    public List<RouteGuideDto> GetRouteGuides(Route route, string? parkingAreaName = null)
    {
        var guides = new List<RouteGuideDto>();
        if (route?.Path?.Coordinates is null || route.Path.Coordinates.Length < 2)
            return guides;

        var coords = route.Path.Coordinates;
        int stepIndex = 0;
        var startsWalkingFromParking = route.OriginParkingAreaId is not null && route.TransitionParkingAreaId is null;
        var transitionIndex = route.TransitionLocation is null
            ? -1
            : Array.FindIndex(coords, coordinate => SameCoordinate(coordinate, route.TransitionLocation.Coordinate));

        guides.Add(new RouteGuideDto
        {
            StepIndex = stepIndex++,
            Location = new Point(coords[0]) { SRID = 4326 },
            TravelMode = startsWalkingFromParking ? TravelMode.Walking : route.TravelMode,
            Instruction = startsWalkingFromParking
                ? "You are parked here. Walk to your destination."
                : route.TransitionLocation is not null
                ? route.TravelMode switch
                {
                    TravelMode.Car => "Start driving towards your destination parking area",
                    TravelMode.Bus => "Board the bus towards your destination parking area",
                    _ => "Start walking towards your destination"
                }
                : route.TravelMode switch
            {
                TravelMode.Car => "Start driving towards your destination",
                TravelMode.Bus => "Board the bus towards your destination",
                _ => "Start walking towards your destination"
            }
        });

        for (int i = 1; i < coords.Length - 1; i++)
        {
            var prevCoord = coords[i - 1];
            var currentCoord = coords[i];
            var isTransition = i == transitionIndex;
            var currentTravelMode = startsWalkingFromParking || (transitionIndex >= 0 && i >= transitionIndex)
                ? TravelMode.Walking
                : route.TravelMode;

            if (isTransition)
            {
                guides.Add(new RouteGuideDto
                {
                    StepIndex = stepIndex++,
                    Location = new Point(currentCoord) { SRID = 4326 },
                    Instruction = $"Park at {parkingAreaName ?? "the parking area"}. Continue walking to your destination.",
                    TravelMode = TravelMode.Walking,
                    IsTransition = true,
                    ParkingAreaId = route.TransitionParkingAreaId
                });
            }

            if (!isTransition)
            {
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
                    Instruction = instruction,
                    TravelMode = currentTravelMode,
                    ParkingAreaId = currentTravelMode == TravelMode.Walking ? route.TransitionParkingAreaId : null
                });
            }
        }

        guides.Add(new RouteGuideDto
        {
            StepIndex = stepIndex,
            Location = new Point(coords[^1]) { SRID = 4326 },
            Instruction = "Proceed to the entrance. You have arrived at your destination",
            TravelMode = startsWalkingFromParking || route.TransitionLocation is not null
                ? TravelMode.Walking
                : route.TravelMode,
            ParkingAreaId = route.TransitionLocation is null ? null : route.TransitionParkingAreaId
        });

        return guides;
    }

    #region Private Helper Methods
    private static bool SameCoordinate(Coordinate left, Coordinate right)
    {
        return Math.Abs(left.X - right.X) < 1e-7 && Math.Abs(left.Y - right.Y) < 1e-7;
    }

    private static (Point Location, double Fraction, double DistanceMeters) ProjectOntoEdge(Point origin, Edge edge)
    {
        var start = edge.FromNode.Location;
        var end = edge.ToNode.Location;
        var latitudeScale = Math.Cos(origin.Y * Math.PI / 180.0);
        var longitudeScale = 111_320 * latitudeScale;
        const double latitudeMetersPerDegree = 110_574;

        var startX = (start.X - origin.X) * longitudeScale;
        var startY = (start.Y - origin.Y) * latitudeMetersPerDegree;
        var endX = (end.X - origin.X) * longitudeScale;
        var endY = (end.Y - origin.Y) * latitudeMetersPerDegree;
        var deltaX = endX - startX;
        var deltaY = endY - startY;
        var lengthSquared = deltaX * deltaX + deltaY * deltaY;
        var fraction = lengthSquared == 0
            ? 0
            : Math.Clamp(-(startX * deltaX + startY * deltaY) / lengthSquared, 0, 1);
        var projectedX = startX + fraction * deltaX;
        var projectedY = startY + fraction * deltaY;
        var projectedLocation = new Point(
            start.X + (end.X - start.X) * fraction,
            start.Y + (end.Y - start.Y) * fraction)
        {
            SRID = 4326
        };

        return (projectedLocation, fraction, Math.Sqrt(projectedX * projectedX + projectedY * projectedY));
    }

    private static Edge CreateTemporaryEdge(Node from, Node to, decimal weight, Edge template)
    {
        return new Edge
        {
            EdgeId = int.MinValue,
            CampusId = template.CampusId,
            FromNode = from,
            FromNodeId = from.NodeId,
            ToNode = to,
            ToNodeId = to.NodeId,
            Weight = weight,
            TravelModes = template.TravelModes
        };
    }

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

    private static LineString BuildLineString(List<Node> path)
    {
        var coordinates = path
            .Select(n => new Coordinate(n.Location.X, n.Location.Y))
            .ToList();

        if (coordinates.Count == 1)
            coordinates.Add(new Coordinate(coordinates[0].X, coordinates[0].Y));

        return new LineString(coordinates.ToArray());
    }

    #endregion
}