using API.Entities;
using API.Interfaces;

namespace API.Data;

public class ApplicationRepository : BaseRepository<Application>, IApplicationRepository
{
    public ApplicationRepository(AppDbContext context) : base(context)
    {
    }
}
