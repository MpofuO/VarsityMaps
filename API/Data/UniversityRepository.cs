using API.Entities;
using API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class UniversityRepository : BaseRepository<University>, IUniversityRepository
{
    public UniversityRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<University?> GetByAliasAsync(string alias)
    {
        return await context.Universities.FirstOrDefaultAsync(u => u.Alias == alias);
    }

    public async Task<University?> GetWithCampusesAsync(int id)
    {
        return await context.Universities
            .Include(u => u.Campuses)
            .FirstOrDefaultAsync(u => u.UniversityId == id);
    }
}
