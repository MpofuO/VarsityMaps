using API.Entities;
using API.Interfaces;

namespace API.Data;

public class CheckpointRepository : BaseRepository<CheckPoint>, ICheckpointRepository
{
    public CheckpointRepository(AppDbContext context) : base(context)
    {
    }
}
