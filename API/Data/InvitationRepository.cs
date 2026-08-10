using API.Entities;
using API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class InvitationRepository : BaseRepository<Invitation>, IInvitationRepository
{
    public InvitationRepository(AppDbContext context) : base(context)
    {
    }

    public Task<IEnumerable<Invitation>> GetAllWithDetailsAsync(int universityId)
    {
        return context.Invitations
            .Include(i => i.Campus)
            .ThenInclude(c => c.University)
            .Where(i => i.Campus.UniversityId == universityId)
            .ToListAsync()
            .ContinueWith(t => (IEnumerable<Invitation>)t.Result);
    }

    public async Task<Invitation?> GetWithDetailsAsync(int id)
    {
        return await context.Invitations
            .Include(i => i.Campus)
            .ThenInclude(c => c.University)
            .FirstOrDefaultAsync(i => i.InvitationId == id);
    }
    public async Task<Invitation?> GetPendingInvitationAsync(int campusId)
    {
        return await context.Invitations
            .Where(i => i.CampusId == campusId && !i.IsAccepted && !i.IsRevoked && 
                        i.DateCreated.AddDays(i.Duration) >= DateTime.UtcNow && 
                        i.FailedPassAttempts < 3).FirstOrDefaultAsync();
    }
}
