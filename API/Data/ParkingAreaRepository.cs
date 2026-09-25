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
            .Include(p => p.AccessNodes)
            .Where(p => p.CampusId == campusId)
            .ToListAsync();
    }

    public async Task<ParkingArea?> GetWithAccessNodesAsync(int parkingAreaId)
    {
        return await context.ParkingAreas
            .Include(p => p.AccessNodes)
            .FirstOrDefaultAsync(p => p.ParkingAreaId == parkingAreaId);
    }
}
