using API.Entities;
using NetTopologySuite.Geometries;
using Route = API.Entities.Route;

namespace API.Interfaces;

public interface IRouteService
{
    List<Route> GetShortestPath(IReadOnlyList<Edge> navigableEdges, IEnumerable<Node> fromEntrances, IEnumerable<Node> toEntrances);
    List<Tuple<Point, string>> GetRouteGuides(Route route);
}
