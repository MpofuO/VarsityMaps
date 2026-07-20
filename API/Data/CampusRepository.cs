using API.Entities;
using API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class CampusRepository : BaseRepository<Campus>, ICampusRepository
{
    public CampusRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Campus>> GetByUniversityAsync(int universityId)
    {
        return await Context.Campuses
            .Where(c => c.UniversityId == universityId)
            .ToListAsync();
    }

    public async Task<Campus?> GetWithBuildingsAsync(int id)
    {
        return await Context.Campuses
            .Include(c => c.Buildings)
            .FirstOrDefaultAsync(c => c.CampusId == id);
    }
}
