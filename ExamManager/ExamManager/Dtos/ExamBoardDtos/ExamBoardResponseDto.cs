namespace ExamManager.Dtos.ExamBoardDtos;

public class ExamBoardResponseDto
{
    public int Id { get; set; }
    
    public int ExamId { get; set; }
    public string ExamName { get; set; }
    public string ExamCode { get; set; }
    
    public int ExaminerId { get; set; }
    public string ExaminerFirstName { get; set; }
    public string ExaminerLastName { get; set; }
    
    public string Role  { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt  { get; set; }
    public string? DeletedByOperatorName { get; set; }
}