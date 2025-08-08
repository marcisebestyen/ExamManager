using System.ComponentModel.DataAnnotations;
using ExamManager.Dtos.ExamBoardDtos;
using ExamManager.Models;

namespace ExamManager.Dtos.ExamDtos;

public class ExamCreateDto
{
    [Required(ErrorMessage = "Exam name is required.")]
    public string ExamName { get; set; }
    
    [Required(ErrorMessage = "Exam code is required.")]
    public string ExamCode { get; set; }
    
    [Required(ErrorMessage = "Exam date is required.")]
    public DateTime ExamDate { get; set; }
    
    [Required(ErrorMessage = "Status is required.")]
    public Status Status { get; set; }
    
    [Required(ErrorMessage = "Profession is required.")]
    public int ProfessionId { get; set; }
    
    [Required(ErrorMessage = "Institution is required.")]
    public int InstitutionId { get; set; }
    
    [Required(ErrorMessage = "Exam type is required.")]
    public int ExamTypeId { get; set; }
    
    public List<ExamBoardCreateSubDto> ExamBoards { get; set; } = new List<ExamBoardCreateSubDto>();
}