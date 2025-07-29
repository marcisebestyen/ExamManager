using ExamManager.Models;

namespace ExamManager.Dtos.BackupHistoryDtos;

public class BackupHistoryResponseDto
{
    public int Id { get; set; }
    public DateTime BackupDate { get; set; }
    public string FileName { get; set; }
    public ActivityType Activity { get; set; }
    public bool IsSuccessful { get; set; }
    public string? ErrorMessage { get; set; }
    
    public int OperatorId { get; set; }
    public string OperatorUserName { get; set; }
}