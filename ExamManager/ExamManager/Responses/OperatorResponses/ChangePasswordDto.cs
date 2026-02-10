using System.ComponentModel.DataAnnotations;

namespace ExamManager.Responses;

public class ChangePasswordDto
{
    [Required]
    [MinLength(6, ErrorMessage = "New password must be at least 6 characters.")]
    public string NewPassword { get; set; }
}