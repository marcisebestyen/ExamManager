namespace ExamManager.Models;

public enum Status
{
    Planned, 
    Active,
    Postponed,
    Completed
}

public class Exam : SoftDeletableEntity
{
    public int Id { get; set; }
    public string ExamName { get; set; } = string.Empty;
    public string ExamCode { get; set; } = string.Empty;
    public DateTime ExamDate { get; set; }
    public Status Status { get; set; }
    
    // foreign keys
    public int ProfessionId { get; set; }
    public int InstitutionId { get; set; }
    public int ExamTypeId { get; set; }
    public int OperatorId  { get; set; }
    
    // navigation properties
    public Profession Profession { get; set; }
    public Institution Institution { get; set; }
    public ExamType ExamType { get; set; }
    public Operator Operator { get; set; }
    
    public ICollection<ExamBoard> ExamBoard { get; set; } = new List<ExamBoard>();
}