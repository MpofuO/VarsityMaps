namespace API.Interfaces;

public interface IUnitOfWork
{
    IUniversityRepository UniversityRepository { get; }
    IUniversityLookupRepository UniversityLookupRepository { get; }
    ICampusRepository CampusRepository { get; }
    IBuildingRepository BuildingRepository { get; }
    IParkingAreaRepository ParkingAreaRepository { get; }
    INodeRepository NodeRepository { get; }
    IEdgeRepository EdgeRepository { get; }
    IRouteRepository RouteRepository { get; }
    IRouteGuideRepository RouteGuideRepository { get; }
    IApplicationRepository ApplicationRepository { get; }
    IInvitationRepository InvitationRepository { get; }
    Task<bool> CompleteAsync();
}
