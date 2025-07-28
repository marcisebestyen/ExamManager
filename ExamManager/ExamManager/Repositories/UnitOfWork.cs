using ExamManager.Data;
using ExamManager.Models;

namespace ExamManager.Repositories;

public interface IUnitOfWork : IDisposable
{
    IRepository<BackupHistory> BackupHistoryRepository { get; }
    IRepository<Exam> ExamRepository { get; }
    IRepository<ExamBoard> ExamBoardRepository { get; }
    IRepository<Examiner> ExaminerRepository { get; }
    IRepository<ExamType> ExamTypeRepository { get; }
    IRepository<Institution> InstitutionRepository { get; }
    IRepository<Operator> OperatorRepository { get; }
    IRepository<PasswordReset> PasswordResetRepository { get; }
    IRepository<Profession> ProfessionRepository { get; }
    Task SaveAsync();
}

public class UnitOfWork : IUnitOfWork
{
    private readonly ExamDbContext _dbContext;

    public IRepository<BackupHistory> BackupHistoryRepository { get; set; }
    public IRepository<Exam> ExamRepository { get; set; }
    public IRepository<ExamBoard> ExamBoardRepository { get; set; }
    public IRepository<Examiner> ExaminerRepository { get; set; }
    public IRepository<ExamType> ExamTypeRepository { get; set; }
    public IRepository<Institution> InstitutionRepository { get; set; }
    public IRepository<Operator> OperatorRepository { get; set; }
    public IRepository<PasswordReset> PasswordResetRepository { get; set; }
    public IRepository<Profession> ProfessionRepository { get; set; }

    public UnitOfWork(ExamDbContext dbContext)
    {
        _dbContext = dbContext ??  throw new ArgumentNullException(nameof(dbContext));
        
        BackupHistoryRepository = new Repository<BackupHistory>(_dbContext);
        ExamRepository = new Repository<Exam>(_dbContext);
        ExamBoardRepository = new Repository<ExamBoard>(_dbContext);
        ExaminerRepository = new Repository<Examiner>(_dbContext);
        ExamTypeRepository = new Repository<ExamType>(_dbContext);
        InstitutionRepository = new Repository<Institution>(_dbContext);
        OperatorRepository = new Repository<Operator>(_dbContext);
        PasswordResetRepository = new Repository<PasswordReset>(_dbContext);
        ProfessionRepository = new Repository<Profession>(_dbContext);
    }

    public async Task SaveAsync()
    {
        await _dbContext.SaveChangesAsync();
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}