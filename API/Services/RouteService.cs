using API.Entities;
using API.Interfaces;
using Route = API.Entities.Route;

namespace API.Services;

public class RouteService : IRouteService
{
    public Route GetShortestPath(List<Edge> edges)
    {
        return new Route();
    }

    public List<string> GetRouteGuides(Route route)
    {
        return [];
    }
}
