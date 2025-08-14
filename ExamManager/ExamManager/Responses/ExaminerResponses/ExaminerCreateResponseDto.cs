namespace ExamManager.Responses.ExaminerResponses;

public class ExaminerCreateResponseDto
{
    public int Id { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public DateTime DateOfBirth { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
    public string IdentityCardNumber { get; set; }
}