using API.Interfaces;

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
        CheckpointRepository = new CheckpointRepository(_context);
        ApplicationRepository = new ApplicationRepository(_context);
        InvitationRepository = new InvitationRepository(_context);
    }

    public IUniversityRepository UniversityRepository { get; }
    public ICampusRepository CampusRepository { get; }
    public IBuildingRepository BuildingRepository { get; }
    public INodeRepository NodeRepository { get; }
    public IEdgeRepository EdgeRepository { get; }
    public IRouteRepository RouteRepository { get; }
    public ICheckpointRepository CheckpointRepository { get; }
    public IApplicationRepository ApplicationRepository { get; }
    public IInvitationRepository InvitationRepository { get; }

    public async Task<bool> CompleteAsync()
    {
        return await _context.SaveChangesAsync() > 0;
    }
}
