using ExamManager.Models;

namespace ExamManager.Dtos.OperatorDtos;

public class OperatorUpdateDto
{
    public string? FirtName { get; set; }
    public string? LastName { get; set; }
    public Role? Role { get; set; }
}