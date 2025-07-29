using ExamManager.Dtos.ExamBoardDtos;
using ExamManager.Models;

namespace ExamManager.Dtos.ExamDtos;

public class ExamUpdateDto
{
    public string? ExamName { get; set; }
    public string? ExamCode { get; set; }
    public DateTime? ExamDate { get; set; }
    public Status? Status { get; set; }
    
    public int? ProfessionId { get; set; }
    public int? InstitutionId { get; set; }
    public int? ExamTypeId { get; set; }
    public int? OperatorId { get; set; }
    
    public List<ExamBoardUpdateSubDto>? ExamBoards { get; set; } = new List<ExamBoardUpdateSubDto>();
}