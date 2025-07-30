using System.Linq.Expressions;

namespace ExamManager.Repositories;

public interface IRepository<T> where T : class
{
    Task<IEnumerable<T>> GetAsync(Expression<Func<T, bool>> predicate, string[]? includeProperties = null);
    Task<T?> GetByIdAsync(object[] keyValues, string[]? includeReferences = null, string[]? includeCollections = null);
    Task<IEnumerable<T>> GetWithDeletedAsync(Expression<Func<T, bool>> predicate, string[]? includeProperties = null);
    Task<IEnumerable<T>> GetAllAsync(string[]? includeProperties = null);
    Task InsertAsync(T entity);
    Task DeleteAsync(params object[] keyValues);
    Task SoftDeleteAsync(params object[] keyValues);
    Task UpdateASync(T entity);

    Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
        Expression<Func<T, bool>> predicate,
        int pageNumber,
        int pageSize,
        string[]? includeProperties = null
    );
}