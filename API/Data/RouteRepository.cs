using API.Interfaces;
using Microsoft.EntityFrameworkCore;
using Route = API.Entities.Route;

namespace API.Data;

public class RouteRepository : BaseRepository<Route>, IRouteRepository
{
    public RouteRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<Route?> GetByNodesAsync(int fromNodeId, int toNodeId)
    {
        return await context.Routes
            .FirstOrDefaultAsync(r => r.FromNodeId == fromNodeId && r.ToNodeId == toNodeId);
    }

    public async Task<Route?> GetWithCheckPointsAsync(int fromNodeId, int toNodeId)
    {
        return await context.Routes
            .Include(r => r.Checkpoints)
            .FirstOrDefaultAsync(r => r.FromNodeId == fromNodeId && r.ToNodeId == toNodeId);
    }
    public async Task<Route?> GetWithCheckPointsAsync(int routeId)
    {
        return await context.Routes
            .Include(r => r.Checkpoints)
            .FirstOrDefaultAsync(r => r.RouteId == routeId);
    }
}
