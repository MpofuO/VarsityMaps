using API.Entities;
using API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class BuildingRepository : BaseRepository<Building>, IBuildingRepository
{
    public BuildingRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Building>> GetAccessibleAsync(int campusId)
    {
        return await context.Buildings
            .Where(b => b.CampusId == campusId && b.IsAccessible)
            .ToListAsync();
    }

    public async Task<Building?> GetByAliasAsync(int campusId, string alias)
    {
        return await context.Buildings
            .FirstOrDefaultAsync(b => b.CampusId == campusId && b.Alias == alias);
    }

    public async Task<IEnumerable<Building>> GetByCampusAsync(int campusId)
    {
        return await context.Buildings
            .Where(b => b.CampusId == campusId)
            .ToListAsync();
    }

    public async Task<Building?> GetByNameAsync(int campusId, string name)
    {
        return await context.Buildings
            .FirstOrDefaultAsync(b => b.CampusId == campusId && b.Name == name);
    }

    public async Task<IEnumerable<Building>> GetGuestAccessibleAsync(int campusId)
    {
        return await context.Buildings
            .Where(b => b.CampusId == campusId && b.IsGuestAccessible)
            .ToListAsync();
    }

    public async Task<Building?> GetWithEntrancesAsync(int id)
    {
        return await context.Buildings
            .Include(b => b.Entrances)
            .FirstOrDefaultAsync(b => b.BuildingId == id);
    }
}
