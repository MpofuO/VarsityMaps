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
            .ThenInclude(c => c.University)
            .ToListAsync()
            .ContinueWith(t => (IEnumerable<Invitation>)t.Result);
    }

    public async Task<Invitation?> GetAllWithDetailsAsync(int id)
    {
        return await context.Invitations
            .Include(i => i.Campus)
            .ThenInclude(c => c.University)
            .FirstOrDefaultAsync(i => i.InvitationId == id);
    }
}
