using System.ComponentModel.DataAnnotations;

namespace ExamManager.Dtos.ProfessionDtos;

public class ProfessionCreateDto
{
    [Required(ErrorMessage = "Keor ID is required")]
    public string KeorId { get; set; }
    
    [Required(ErrorMessage = "Profession name is required")]
    public string ProfessionName { get; set; }
}