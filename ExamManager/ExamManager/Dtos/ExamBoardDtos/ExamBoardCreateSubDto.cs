using System.ComponentModel.DataAnnotations;

namespace ExamManager.Dtos.ExamBoardDtos;

public class ExamBoardCreateSubDto
{
    [Required(ErrorMessage = "Examiner is required.")]
    public int ExaminerId { get; set; }
    
    [Required(ErrorMessage = "Role is required.")]
    public string Role { get; set; }
}