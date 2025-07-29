namespace ExamManager.Dtos.PasswordResetDtos;

public class PasswordResetConfirmDto
{
    public string Token { get; set; }
    public string NewPassword { get; set; }
}