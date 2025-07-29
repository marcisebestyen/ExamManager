using ExamManager.Models;

namespace ExamManager.Dtos.BackupHistoryDtos;

public class BackupHistoryCreateDto
{
    public string FileName { get; set; }
    public ActivityType Activity { get; set; }
    public bool IsSuccessful { get; set; }
    public string? ErrorMessage { get; set; }
    public int OperatorId  { get; set; }
}