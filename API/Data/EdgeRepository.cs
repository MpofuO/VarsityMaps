using API.Entities;
using API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class EdgeRepository : BaseRepository<Edge>, IEdgeRepository
{
    public EdgeRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Edge>> GetByCampusAsync(int campusId)
    {
        return await context.Edges
            .Where(e => e.CampusId == campusId)
            .ToListAsync();
    }

    public async Task<IEnumerable<Edge>> GetByNodeAsync(int nodeId)
    {
        return await context.Edges
        .Where(e => e.FromNodeId == nodeId || e.ToNodeId == nodeId)
        .ToListAsync();
    }

    public async Task<Edge?> GetByNodesAsync(int fromNodeId, int toNodeId)
    {
        return await context.Edges
            .FirstOrDefaultAsync(e => e.FromNodeId == fromNodeId && e.ToNodeId == toNodeId);
    }

    public async Task<IReadOnlyList<Edge>> GetNavigableEdgesAsync(int campusId)
    {
        return await context.Edges
            .Include(e => e.FromNode).ThenInclude(n => n.Building)
            .Include(e => e.ToNode).ThenInclude(n => n.Building)
            .Where(e => e.FromNode.CampusId == campusId)
            .Where(e => e.FromNode.Building == null || e.FromNode.Building.IsAccessible)
            .Where(e => e.ToNode.Building == null || e.ToNode.Building.IsAccessible)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Edge>> GetGuestNavigableEdgesAsync(int campusId)
    {
        return await context.Edges
            .Include(e => e.FromNode).ThenInclude(n => n.Building)
            .Include(e => e.ToNode).ThenInclude(n => n.Building)
            .Where(e => e.FromNode.CampusId == campusId)
            .Where(e => e.FromNode.Building == null ||
                        (e.FromNode.Building.IsAccessible && e.FromNode.Building.IsGuestAccessible))
            .Where(e => e.ToNode.Building == null ||
                        (e.ToNode.Building.IsAccessible && e.ToNode.Building.IsGuestAccessible))
            .ToListAsync();
    }
}
