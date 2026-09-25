using System;
using API.Entities;

namespace API.Interfaces;

public interface IParkingAreaRepository : IBaseRepository<ParkingArea>
{
    Task<IEnumerable<ParkingArea>> GetByCampusAsync(int campusId);
    Task<ParkingArea?> GetWithAccessNodesAsync(int parkingAreaId);
}
