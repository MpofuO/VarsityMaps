using API.DTOs;
using API.Entities;
using Route = API.Entities.Route;

namespace API.Interfaces;

public interface IRouteService
{
    List<Route> GetShortestPath(IReadOnlyList<Edge> navigableEdges, 
        IEnumerable<Node> fromEntrances, IEnumerable<Node> toEntrances);
    List<Route> GetMultiLegPath(
        IReadOnlyList<Edge> drivingEdges, IReadOnlyList<Edge> walkingEdges,
        IEnumerable<Node> originEntrances, IEnumerable<Node> destinationEntrances, 
        IEnumerable<Node> parkingAccessNodes);
    List<Route> GetParkingOriginPath(IReadOnlyList<Edge> drivingEdges, IReadOnlyList<Edge> walkingEdges,
        IEnumerable<Node> originParkingNodes, IEnumerable<Node> destinationEntrances,
        IEnumerable<Node> parkingAccessNodes);
    
    List<RouteGuideDto> GetRouteGuides(Route route, string? parkingAreaName = null);
}