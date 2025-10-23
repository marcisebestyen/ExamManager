using ExamManager.Models;

namespace ExamManager.Dtos.OperatorDtos;

public class OperatorResponseDto
{
    public int Id { get; set; }
    public string UserName { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public Role Role { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedByOperatorName { get; set; }
}