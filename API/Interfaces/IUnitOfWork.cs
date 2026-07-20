namespace API.Interfaces;

public interface IUnitOfWork
{
    IUniversityRepository UniversityRepository { get; }
    ICampusRepository CampusRepository { get; }
    IBuildingRepository BuildingRepository { get; }
    INodeRepository NodeRepository { get; }
    IEdgeRepository EdgeRepository { get; }
    Task<int> CompleteAsync();
}
