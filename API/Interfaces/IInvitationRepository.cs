using API.Entities;

namespace API.Interfaces;

public interface IInvitationRepository : IBaseRepository<Invitation>
{
    public Task<IEnumerable<Invitation>> GetAllWithDetailsAsync();
}
