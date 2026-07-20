using API.Entities;

namespace API.Interfaces;

public interface IRouteService
{
    API.Entities.Route GetShortestPath(List<Edge> edges);
    List<string> GetRouteGuides(API.Entities.Route route);
}
