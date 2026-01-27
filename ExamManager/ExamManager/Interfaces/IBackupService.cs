using ExamManager.Dtos.BackupHistoryDtos;
using ExamManager.Models;
using ExamManager.Responses;

namespace ExamManager.Interfaces;

public interface IBackupService
{
    Task<BaseServiceResponse<bool>> PerformManualBackupAsync(int operatorId);
    Task<BaseServiceResponse<bool>> PerformAutomaticBackupAsync();
    Task<BaseServiceResponse<IEnumerable<BackupHistoryResponseDto>>> GetAllBackupsAsync();
}