using API.Entities;

namespace API.Interfaces;

public interface ICampusRepository : IBaseRepository<Campus>
{
    Task<Campus?> GetWithBuildingsAsync(int id);
    Task<IEnumerable<Campus>> GetByUniversityAsync(int universityId);
}
