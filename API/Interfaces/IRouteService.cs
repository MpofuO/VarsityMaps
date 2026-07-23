using API.Entities;
using NetTopologySuite.Geometries;
using Route = API.Entities.Route;

namespace API.Interfaces;

public interface IRouteService
{
    Route GetShortestPath(List<Edge> edges);
    List<Tuple<Point, string>> GetRouteGuides(Route route);
}
