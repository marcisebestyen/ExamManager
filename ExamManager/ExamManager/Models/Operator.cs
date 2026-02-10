namespace ExamManager.Models;

public enum Role
{
    Operator,
    Admin,
    Staff
}

public class Operator : SoftDeletableEntity
{
    public int Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public Role Role { get; set; } = Role.Operator;
    public bool MustChangePassword { get; set; } = false;
}