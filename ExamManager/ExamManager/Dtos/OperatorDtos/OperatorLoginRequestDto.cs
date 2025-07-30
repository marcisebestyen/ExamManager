using System.ComponentModel.DataAnnotations;

namespace ExamManager.Dtos.OperatorDtos;

public class OperatorLoginRequestDto
{
    [Required(ErrorMessage = "Username is required")]
    public string UserName { get; set; }
    
    [Required(ErrorMessage = "Password is required")]
    public string Password { get; set; }
}