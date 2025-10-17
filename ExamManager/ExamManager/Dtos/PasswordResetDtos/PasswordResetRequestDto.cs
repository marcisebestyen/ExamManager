using System.ComponentModel.DataAnnotations;

namespace ExamManager.Dtos.PasswordResetDtos;

public class PasswordResetRequestDto
{
    [Required(ErrorMessage = "Token is required.")]
    public string Token { get; set; }
    [Required(ErrorMessage = "Password is required.")]
    [MinLength(6,  ErrorMessage = "Password must be at least 6 characters long.")]
    public string NewPassword { get; set; }
}