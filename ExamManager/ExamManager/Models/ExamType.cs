namespace ExamManager.Models;

public class ExamType
{
    public int Id { get; set; }
    public string TypeName { get; set; } = string.Empty;
    public string? Description { get; set; }
}