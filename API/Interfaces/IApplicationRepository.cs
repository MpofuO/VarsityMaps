using API.Entities;

namespace API.Interfaces;

public interface IApplicationRepository : IBaseRepository<Application>
{
    Task<Application?> GetByAliasAsync(string alias);
    Task<Application?> GetByNameAsync(string name);
}
