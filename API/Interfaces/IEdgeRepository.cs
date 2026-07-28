using API.Entities;

namespace API.Interfaces;

public interface IEdgeRepository : IBaseRepository<Edge>
{
    Task<IEnumerable<Edge>> GetByCampusAsync(int campusId);
    Task<IEnumerable<Edge>> GetByNodeAsync(int nodeId);
    Task<Edge?> GetByNodesAsync(int fromNodeId, int toNodeId);

    Task<IReadOnlyList<Edge>> GetNavigableEdgesAsync(int campusId);
    Task<IReadOnlyList<Edge>> GetGuestNavigableEdgesAsync(int campusId);
}
