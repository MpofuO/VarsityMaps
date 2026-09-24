using System;
using API.Entities;
using API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class ParkingAreaRepository : BaseRepository<ParkingArea>, IParkingAreaRepository
{
    public ParkingAreaRepository(AppDbContext _context) : base(_context)
    {
    }

    public async Task<IEnumerable<ParkingArea>> GetByCampusAsync(int campusId)
    {
        return await context.ParkingAreas
            .Where(p => p.CampusId == campusId)
            .ToListAsync();
    }
}
