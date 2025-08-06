namespace ExamManager.Models;

public class Examiner : SoftDeletableEntity
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string IdentityCardNumber { get; set; } = string.Empty;

    public ICollection<ExamBoard> ExamBoard { get; set; } = new List<ExamBoard>();
}