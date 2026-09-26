using API.Entities;
using API.Interfaces;
using Microsoft.EntityFrameworkCore;
using Route = API.Entities.Route;

namespace API.Data;

public class RouteRepository : BaseRepository<Route>, IRouteRepository
{
    public RouteRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<List<Route>> GetByBuildingsWithGuidesAsync(int fromBuildingId, int toBuildingId, TravelMode mode, int? originParkingAreaId)
    {
        return await context.Routes
            .Include(r => r.RouteGuides.OrderBy(g => g.StepIndex))
            .Where(r => r.FromBuildingId == fromBuildingId && r.ToBuildingId == toBuildingId
                     && r.TravelMode == mode && r.OriginParkingAreaId == originParkingAreaId)
            .OrderBy(r => r.Weight)
            .ToListAsync();
    }

    public async Task<Route?> GetByNodesAsync(int fromNodeId, int toNodeId)
    {
        return await context.Routes
            .FirstOrDefaultAsync(r => r.FromNodeId == fromNodeId && r.ToNodeId == toNodeId);
    }

    public async Task<Route?> GetWithRouteGuidesAsync(int routeId)
    {
        return await context.Routes
            .Include(r => r.RouteGuides.OrderBy(g => g.StepIndex))
            .FirstOrDefaultAsync(r => r.RouteId == routeId);
    }

    public async Task DeleteByBuildingAsync(int buildingId)
    {
        var routes = await context.Routes
            .Where(r => r.FromBuildingId == buildingId || r.ToBuildingId == buildingId)
            .ToListAsync();
        context.Routes.RemoveRange(routes);
    }
}
