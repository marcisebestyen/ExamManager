namespace ExamManager.Dtos.PasswordResetDtos;

public class PasswordResetResponseDto
{
    public int Id { get; set; }
    public string Token { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime ExpiredAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public bool IsRevoked { get; set; }
    
    public int OperatorId { get; set; }
    public string OperatorUserName { get; set; }
}