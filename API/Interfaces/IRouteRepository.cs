using API.Entities;
using Route = API.Entities.Route;

namespace API.Interfaces;

public interface IRouteRepository : IBaseRepository<Route>
{
    Task<Route?> GetByNodesAsync(int fromNodeId, int toNodeId);
    Task<List<Route>> GetByBuildingsWithGuidesAsync(int fromBuildingId, int toBuildingId, TravelMode mode, int? originParkingAreaId);
    Task<Route?> GetWithRouteGuidesAsync(int routeId);
    Task DeleteByBuildingAsync(int buildingId);
    Task DeleteByCampusAsync(int campusId);
}
