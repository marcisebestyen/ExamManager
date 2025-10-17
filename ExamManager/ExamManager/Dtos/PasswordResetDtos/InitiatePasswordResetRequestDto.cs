using System.ComponentModel.DataAnnotations;

namespace ExamManager.Dtos.PasswordResetDtos;

public class InitiatePasswordResetRequestDto
{
    [Required(ErrorMessage = "User name is required.")]
    public string UserName { get; set; }
}