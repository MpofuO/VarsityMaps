using API.Entities;
using API.Interfaces;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace API.Data;

public class NodeRepository : BaseRepository<Node>, INodeRepository
{
    public NodeRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Node>> GetByBuildingAsync(int buildingId)
    {
        return await context.Nodes
            .Where(n => n.BuildingId == buildingId)
            .ToListAsync();
    }

    public async Task<IEnumerable<Node>> GetByCampusAsync(int campusId)
    {
        return await context.Nodes
            .Where(n => n.CampusId == campusId)
            .ToListAsync();
    }

    public async Task<Node?> GetNearestAsync(Point location, int campusId)
    {
        return await context.Nodes
            .Where(n => n.CampusId == campusId)
            .OrderBy(n => Math.Abs(n.Location!.X - location.X) + Math.Abs(n.Location.Y - location.Y))
            .FirstOrDefaultAsync();
    }
}
