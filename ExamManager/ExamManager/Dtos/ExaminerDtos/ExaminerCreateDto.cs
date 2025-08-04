using System.ComponentModel.DataAnnotations;

namespace ExamManager.Dtos.ExaminerDtos;

public class ExaminerCreateDto
{
    [Required(ErrorMessage = "First name is required.")]
    public string FirstName { get; set; }
    
    [Required(ErrorMessage = "Last name is required.")]
    public string LastName { get; set; }
    
    [Required(ErrorMessage = "Birth date is required.")]
    public DateTime DateOfBirth { get; set; }
    
    [Required(ErrorMessage = "Email is required.")]
    public string Email { get; set; }
    
    [Required(ErrorMessage = "Phone number is required.")]
    public string Phone { get; set; }
    
    [Required(ErrorMessage = "Identity card number is required.")]
    public string IdentityCardNumber { get; set; }
}