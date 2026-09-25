using API.Entities;
using NetTopologySuite.Geometries;

namespace API.Interfaces;

public interface INodeRepository : IBaseRepository<Node>
{
    Task<IEnumerable<Node>> GetByCampusAsync(int campusId);
    Task<IEnumerable<Node>> GetByBuildingAsync(int buildingId);
    Task<IEnumerable<Node>> GetByParkingAreaAsync(int parkingAreaId);
    Task<Node?> GetNearestAsync(Point location, int campusId);
}
