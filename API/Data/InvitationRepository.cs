using API.Entities;
using API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class InvitationRepository : BaseRepository<Invitation>, IInvitationRepository
{
    public InvitationRepository(AppDbContext context) : base(context)
    {
    }

    public Task<IEnumerable<Invitation>> GetAllWithDetailsAsync()
    {
        return context.Invitations
            .Include(i => i.Campus)
            .ToListAsync()
            .ContinueWith(t => (IEnumerable<Invitation>)t.Result);
    }
}
