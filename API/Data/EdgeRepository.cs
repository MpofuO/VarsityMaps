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
        return await Context.Edges
            .Where(e => e.CampusId == campusId)
            .ToListAsync();
    }

    public async Task<Edge?> GetByNodesAsync(int fromNodeId, int toNodeId)
    {
        return await Context.Edges
            .FirstOrDefaultAsync(e => e.FromNodeId == fromNodeId && e.ToNodeId == toNodeId);
    }
}
