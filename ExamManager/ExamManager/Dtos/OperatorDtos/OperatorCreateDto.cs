using ExamManager.Models;

namespace ExamManager.Dtos.OperatorDtos;

public class OperatorCreateDto
{
    public string UserName { get; set; }
    public string Password { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public Role Role { get; set; }
}