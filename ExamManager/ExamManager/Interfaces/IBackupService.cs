using ExamManager.Responses;

namespace ExamManager.Interfaces;

public interface IBackupService
{
    Task<BaseServiceResponse<bool>> PerformManualBackup(int operatorId);
}