namespace ExamManager.Models;

public class ExamBoard : SoftDeletableEntity
{
    // foreign keys
    public int ExamId { get; set; }
    public int ExaminerId { get; set; }

    public string Role { get; set; } = string.Empty;

    // navigation properties
    public Exam Exam { get; set; }
    public Examiner Examiner { get; set; }
}