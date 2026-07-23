using API.Entities;
using API.Interfaces;
using NetTopologySuite.Geometries;
using Route = API.Entities.Route;

namespace API.Services;

public class RouteService : IRouteService
{
    public Route GetShortestPath(List<Edge> edges)
    {
        return new Route();
    }

    public List<Tuple<Point, string>> GetRouteGuides(Route route)
    {
        return [];
    }
}
