using API.Entities;

namespace API.Interfaces;

public interface IUniversityRepository : IBaseRepository<University>
{
    Task<University?> GetByAliasAsync(string alias);
    Task<University?> GetWithCampusesAsync(int id);
}
