using API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class BaseRepository<T> : IBaseRepository<T> where T : class
{
    protected AppDbContext context;

    public BaseRepository(AppDbContext _context)
    {
        context = _context;
    }

    public async Task CreateAsync(T entity)
    {
        await context.Set<T>().AddAsync(entity);
    }

    public async Task DeleteAsync(T entity)
    {
        context.Set<T>().Remove(entity);
    }

    public async Task<IEnumerable<T>> GetAllAsync()
    {
        return await context.Set<T>().ToListAsync();
    }

    public async Task<T?> GetByIdAsync(int id)
    {
        return await context.Set<T>().FindAsync(id).AsTask();
    }

    public async Task UpdateAsync(T entity)
    {
        context.Set<T>().Update(entity);
    }
}