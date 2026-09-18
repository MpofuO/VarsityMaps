using API.Entities;
using Route = API.Entities.Route;

namespace API.Interfaces;

public interface IRouteRepository : IBaseRepository<Route>
{
    Task<Route?> GetByNodesAsync(int fromNodeId, int toNodeId);
    Task<Route?> GetByBuildingsAsync(int fromBuildingId, int toBuildingId, TravelMode mode);
    Task<Route?> GetWithCheckPointsAsync(int fromNodeId, int toNodeId);
    Task<Route?> GetWithCheckPointsAsync(int routeId);
}
