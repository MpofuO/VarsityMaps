using API.Entities;

namespace API.Interfaces;

public interface IInvitationRepository : IBaseRepository<Invitation>
{
    public Task<IEnumerable<Invitation>> GetAllWithDetailsAsync(int universityId);
    public Task<Invitation?> GetWithDetailsAsync(int id);
    public Task<Invitation?> GetPendingInvitationAsync(int campusId);
    public Task<Invitation?> GetPendingInvitationByEmailAsync(string email);
}
