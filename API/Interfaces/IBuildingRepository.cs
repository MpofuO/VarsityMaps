using API.Entities;

namespace API.Interfaces;

public interface IBuildingRepository : IBaseRepository<Building>
{
    Task<Building?> GetWithEntrancesAsync(int id);
    Task<IEnumerable<Building>> GetByCampusAsync(int campusId);
    Task<IEnumerable<Building>> GetAccessibleAsync(int campusId);
    Task<IEnumerable<Building>> GetGuestAccessibleAsync(int campusId);
}
