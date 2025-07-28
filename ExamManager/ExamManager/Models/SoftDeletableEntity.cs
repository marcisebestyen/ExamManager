namespace ExamManager.Models;

public abstract class SoftDeletableEntity
{
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
    public int? DeletedById { get; set; }
    
    public Operator?  DeletedBy { get; set; }
}