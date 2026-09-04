using API.Entities;
using API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class ApplicationRepository : BaseRepository<Application>, IApplicationRepository
{
    public ApplicationRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<Application?> GetByAliasAsync(string alias)
    {
        return await context.Applications.FirstOrDefaultAsync(a => a.UniversityAlias.ToLower() == alias.ToLower());
    }

    public async Task<Application?> GetByNameAsync(string name)
    {
        return await context.Applications.FirstOrDefaultAsync(a => a.UniversityName.ToLower() == name.ToLower());
    }
}
