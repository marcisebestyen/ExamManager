using System.ComponentModel.DataAnnotations;

namespace ExamManager.Dtos;

public class ExamTypeCreateDto
{
    [Required(ErrorMessage = "Name is required.")]
    public string TypeName { get; set; }
    public string? Description { get; set; }
}