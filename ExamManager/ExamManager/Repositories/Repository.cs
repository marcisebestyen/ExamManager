using System.Linq.Expressions;
using ExamManager.Data;
using ExamManager.Models;
using Microsoft.EntityFrameworkCore;

namespace ExamManager.Repositories;

public class Repository<T> : IRepository<T> where T : class
{
    private readonly ExamDbContext _dbContext;
    private readonly DbSet<T> _dbSet;

    public Repository(ExamDbContext dbContext)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _dbSet = _dbContext.Set<T>();
    }

    public async Task<IEnumerable<T>> GetAsync(Expression<Func<T, bool>> predicate, string[]? includeProperties = null)
    {
        IQueryable<T> query = _dbSet.Where(predicate);

        if (includeProperties != null)
        {
            foreach (var includeProperty in includeProperties)
            {
                query = query.Include(includeProperty);
            }
        }

        return await query.ToListAsync();
    }

    public async Task<T?> GetByIdAsync(object[] keyValues, string[]? includeReferences = null,
        string[]? includeCollections = null)
    {
        T? entity = await _dbSet.FindAsync(keyValues);
        if (entity == null)
        {
            return null;
        }

        List<Task> tasks = new List<Task>();

        if (includeReferences != null)
        {
            foreach (var includeReference in includeReferences)
            {
                tasks.Add(_dbContext
                    .Entry(entity)
                    .Reference(includeReference)
                    .LoadAsync());
            }
        }

        if (includeCollections != null)
        {
            foreach (var includeCollection in includeCollections)
            {
                tasks.Add(_dbContext
                    .Entry(entity)
                    .Collection(includeCollection)
                    .LoadAsync());
            }
        }

        await Task.WhenAll(tasks);
        return entity;
    }

    public async Task<IEnumerable<T>> GetWithDeletedAsync(Expression<Func<T, bool>> predicate,
        string[]? includeProperties = null)
    {
        IQueryable<T> query = _dbSet.IgnoreQueryFilters().Where(predicate);

        if (includeProperties != null)
        {
            foreach (var includeProperty in includeProperties)
            {
                query = query.Include(includeProperty);
            }
        }

        return await query.ToListAsync();
    }

    public async Task<IEnumerable<T>> GetAllAsync(string[]? includeProperties = null)
    {
        IQueryable<T> query = _dbSet;

        if (includeProperties != null)
        {
            foreach (var includeProperty in includeProperties)
            {
                query = query.Include(includeProperty);
            }
        }

        return await query.ToListAsync();
    }

    public async Task InsertAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
    }

    public async Task DeleteAsync(params object[] keyValues)
    {
        T? entity = await _dbSet.FindAsync(keyValues);

        if (entity != null)
        {
            _dbSet.Remove(entity);
        }
        else
        {
            throw new KeyNotFoundException(
                $"Entity of type {typeof(T).Name} with the provided key values was not found.");
        }
    }

    public async Task SoftDeleteAsync(params object[] keyValues)
    {
        T? entity = await _dbSet.FindAsync(keyValues);

        if (entity != null && entity is SoftDeletableEntity softDeletableEntity)
        {
            softDeletableEntity.IsDeleted = true;
            softDeletableEntity.DeletedAt = DateTime.UtcNow;

            _dbSet.Update(entity);
        }
        else
        {
            throw new KeyNotFoundException(
                $"Entity of type {typeof(T).Name} with the provided key values was not found.");
        }
    }

    public Task UpdateASync(T entity)
    {
        _dbSet.Update(entity);
        return Task.CompletedTask;
    }

    public async Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
        Expression<Func<T, bool>> predicate,
        int pageNumber,
        int pageSize,
        string[]? includeProperties = null)
    {
        IQueryable<T> query = _dbSet.Where(predicate);

        if (includeProperties != null)
        {
            foreach (var includeProperty in includeProperties)
            {
                query = query.Include(includeProperty);
            }
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }
}