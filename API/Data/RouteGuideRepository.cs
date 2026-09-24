using API.Entities;
using API.Interfaces;

namespace API.Data;

public class RouteGuideRepository : BaseRepository<RouteGuide>, IRouteGuideRepository
{
    public RouteGuideRepository(AppDbContext context) : base(context)
    {
    }
}