namespace ExamManager.Models;

public enum FileAction
{
    Import = 1,
    Export = 2,
    DownloadTemplate = 3,
    GenerateReport = 4,
}

public enum FileCategory
{
    General = 0,
    Exam = 1,
    Examiner = 2,
    ExamType = 3,
    Institution = 4,
    Profession = 5,
}

public class FileHistory
{
    public int Id { get; set; }
    public int OperatorId { get; set; }
    public string FileName { get; set; }
    public string ContentType { get; set; }
    public long FileSizeInBytes { get; set; }
    public byte[] FileContent { get; set; }
    public FileAction Action { get; set; }
    public FileCategory Category { get; set; }
    public int? RelatedEntityId { get; set; }
    public bool IsSuccessful { get; set; }
    public string? ProcessingNotes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public Operator Operator { get; set; }
}