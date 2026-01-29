namespace ExamManager.Dtos.FileHistoryDtos;

public class FileHistoryResponseDto
{
    public int Id { get; set; }
    public string FileName { get; set; }
    public string ContentType { get; set; }
    public long FileSizeInBytes { get; set; } 
    public string Action { get; set; }        
    public string Category { get; set; }      
    public int OperatorId { get; set; }
    public string OperatorUserName { get; set; }
    public bool IsSuccessful { get; set; }
    public string? ProcessingNotes { get; set; }
    public int? RelatedEntityId { get; set; }
    public DateTime CreatedAt { get; set; }
}