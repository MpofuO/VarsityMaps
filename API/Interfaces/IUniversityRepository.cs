using API.Entities;

namespace API.Interfaces;

public interface IUniversityRepository : IBaseRepository<University>
{
    Task<IEnumerable<University>> GetAllWithCampuses();
    Task<University?> GetByAliasAsync(string alias);
    Task<University?> GetByNameAsync(string name);
    Task<University?> GetWithCampusesAsync(int id);
}
