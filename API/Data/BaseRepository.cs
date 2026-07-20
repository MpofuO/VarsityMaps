using API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class BaseRepository<T> : IBaseRepository<T> where T : class
{
    protected readonly AppDbContext Context;

    public BaseRepository(AppDbContext context)
    {
        Context = context;
    }

    public async Task<T> CreateAsync(T entity)
    {
        await Context.Set<T>().AddAsync(entity);
        await Context.SaveChangesAsync();
        return entity;
    }

    public async Task DeleteAsync(T entity)
    {
        Context.Set<T>().Remove(entity);
        await Context.SaveChangesAsync();
    }

    public async Task<IEnumerable<T>> GetAllAsync()
    {
        return await Context.Set<T>().ToListAsync();
    }

    public async Task<T?> GetByIdAsync(int id)
    {
        return await Context.Set<T>().FindAsync(id).AsTask();
    }

    public async Task UpdateAsync(T entity)
    {
        Context.Set<T>().Update(entity);
        await Context.SaveChangesAsync();
    }
}
