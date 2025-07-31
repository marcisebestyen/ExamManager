using ExamManager.Models;

namespace ExamManager.Responses;

public class OperatorLoginResponseDto
{
    public int Id { get; set; }
    public string UserName { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public Role Role { get; set; }
    public string Token { get; set; }
}