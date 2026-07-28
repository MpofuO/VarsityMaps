using API.Entities;
using API.Interfaces;
using NetTopologySuite.Geometries;
using Route = API.Entities.Route;

namespace API.Services;

public class RouteService : IRouteService
{
    public Route? GetShortestPath(IReadOnlyList<Edge> navigableEdges, IEnumerable<Node> fromEntrances, IEnumerable<Node> toEntrances)
    {
        var graph = BuildAdjacency(navigableEdges);

        Route? best = null;

        foreach (var from in fromEntrances)
        {
            var (distances, previous) = Dijkstra(graph, from.NodeId);

            foreach (var to in toEntrances)
            {
                if (!distances.TryGetValue(to.NodeId, out var distance)) continue;
                if (best is not null && distance >= best.Weight) continue;

                var path = ReconstructPath(previous, from.NodeId, to.NodeId, navigableEdges);
                if (path is null) continue;

                best = new Route
                {
                    Path = BuildLineString(path),
                    FromNodeId = from.NodeId,
                    ToNodeId = to.NodeId,
                    Weight = distance,
                    CheckPoints = [] // deliberately skipped, per earlier decision
                };
            }
        }

        return best;
    }

    public List<Tuple<Point, string>> GetRouteGuides(Route route)
    {
        throw new NotImplementedException();
    }

    #region Private Helper Methods

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
            if (!previous.TryGetValue(currentId, out var prevId)) return null; // no path exists
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