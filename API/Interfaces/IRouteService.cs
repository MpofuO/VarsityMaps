using API.DTOs;
using API.Entities;
using Route = API.Entities.Route;

namespace API.Interfaces;

public interface IRouteService
{
    List<Route> GetShortestPath(IReadOnlyList<Edge> navigableEdges, IEnumerable<Node> fromEntrances, IEnumerable<Node> toEntrances);
    List<RouteGuideDto> GetRouteGuides(Route route);
}