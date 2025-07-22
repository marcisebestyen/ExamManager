namespace ExamManager.Models;

public enum ActivityType
{
    Auto, 
    Manual,
    Restore
}

public class BackupHistory
{
    public int Id { get; set; }
    public DateTime BackupDate { get; set; }
    public string FileName { get; set; } = string.Empty;
    public ActivityType ActivityType { get; set; }
    public bool IsSuccessful { get; set; }
    public string? ErrorMessage { get; set; }
    
    // foreign keys
    public int OperatorId { get; set; }
    
    // navigation properties
    public Operator Operator { get; set; }
}