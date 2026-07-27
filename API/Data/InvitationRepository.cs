using API.Entities;
using API.Interfaces;

namespace API.Data;

public class InvitationRepository : BaseRepository<Invitation>, IInvitationRepository
{
    public InvitationRepository(AppDbContext context) : base(context)
    {
    }

    public Task<IEnumerable<Invitation>> GetAllWithDetailsAsync()
    {
        throw new NotImplementedException();
    }
}
