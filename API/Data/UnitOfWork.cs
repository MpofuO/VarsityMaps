using API.Entities;
using API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
        UniversityRepository = new UniversityRepository(_context);
        CampusRepository = new CampusRepository(_context);
        BuildingRepository = new BuildingRepository(_context);
        NodeRepository = new NodeRepository(_context);
        EdgeRepository = new EdgeRepository(_context);
        RouteRepository = new RouteRepository(_context);
        RouteGuideRepository = new RouteGuideRepository(_context);
        ApplicationRepository = new ApplicationRepository(_context);
        InvitationRepository = new InvitationRepository(_context);
    }

    public IUniversityRepository UniversityRepository { get; }
    public ICampusRepository CampusRepository { get; }
    public IBuildingRepository BuildingRepository { get; }
    public INodeRepository NodeRepository { get; }
    public IEdgeRepository EdgeRepository { get; }
    public IRouteRepository RouteRepository { get; }
    public IRouteGuideRepository RouteGuideRepository { get; }
    public IApplicationRepository ApplicationRepository { get; }
    public IInvitationRepository InvitationRepository { get; }

    public async Task<bool> CompleteAsync()
    {
        var edgeCampusIds = _context.ChangeTracker
            .Entries<Edge>()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Deleted)
            .Select(e => e.Entity.CampusId);

        var buildingCampusIds = _context.ChangeTracker
            .Entries<Building>()
            .Where(e => e.State == EntityState.Modified &&
                        (e.Property(b => b.IsAccessible).IsModified ||
                         e.Property(b => b.IsGuestAccessible).IsModified))
            .Select(e => e.Entity.CampusId);

        var affectedCampusIds = edgeCampusIds.Union(buildingCampusIds).ToList();

        var result = await _context.SaveChangesAsync();

        if (result > 0 && affectedCampusIds.Count > 0)
        {
            await _context.Routes
                .Where(r => affectedCampusIds.Contains(r.CampusId))
                .ExecuteDeleteAsync();
        }

        return result > 0;
    }
}
