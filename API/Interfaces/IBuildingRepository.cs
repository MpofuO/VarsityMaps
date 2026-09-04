using API.Entities;

namespace API.Interfaces;

public interface IBuildingRepository : IBaseRepository<Building>
{
    Task<Building?> GetWithEntrancesAsync(int id);
    Task<Building?> GetByNameAsync(int campusId, string name);
    Task<Building?> GetByAliasAsync(int campusId, string alias);
    Task<IEnumerable<Building>> GetByCampusAsync(int campusId);
    Task<IEnumerable<Building>> GetAccessibleAsync(int campusId);
    Task<IEnumerable<Building>> GetGuestAccessibleAsync(int campusId);
}
