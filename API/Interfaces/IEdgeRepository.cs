using API.Entities;

namespace API.Interfaces;

public interface IEdgeRepository : IBaseRepository<Edge>
{
    Task<IEnumerable<Edge>> GetByCampusAsync(int campusId);
    Task<Edge?> GetByNodesAsync(int fromNodeId, int toNodeId);
}
