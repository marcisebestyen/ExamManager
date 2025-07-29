using ExamManager.Dtos.ExamBoardDtos;
using ExamManager.Models;

namespace ExamManager.Dtos.ExamDtos;

public class ExamResponseDto
{
    public int Id { get; set; }
    public string ExamName { get; set; }
    public string ExamCode { get; set; }
    public DateTime ExamDate { get; set; }
    public Status Status { get; set; }

    public int ProfessionId { get; set; }
    public string ProfessionKeorId { get; set; }
    public string ProfessionName { get; set; }
    
    public int InstitutionId { get; set; }
    public string InstitutionName { get; set; }
    
    public string ExamTypeId { get; set; }
    public string ExamTypeName { get; set; }
    
    public int OperatorId { get; set; }
    public string OperatorUserName { get; set; }
    
    public List<ExamBoardResponseDto> ExamBoards { get; set; } = new List<ExamBoardResponseDto>();
    
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedByOperatorName { get; set; }
}