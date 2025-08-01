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