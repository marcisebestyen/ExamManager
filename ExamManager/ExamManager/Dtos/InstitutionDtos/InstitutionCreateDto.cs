using System.ComponentModel.DataAnnotations;

namespace ExamManager.Dtos.InstitutionDtos;

public class InstitutionCreateDto
{
    [Required(ErrorMessage = "Name is required.")]
    public string Name { get; set; }
    
    [Required(ErrorMessage = "Educational ID is required.")]
    public string EducationalId { get; set; }
    
    [Required(ErrorMessage = "Zipcode is required.")]
    public int ZipCode { get; set; }
    
    [Required(ErrorMessage = "Town is required.")]
    public string Town  { get; set; }
    
    [Required(ErrorMessage = "Street is required.")]
    public string Street { get; set; }
    
    [Required(ErrorMessage = "House number is required.")]
    public string Number { get; set; }
    public string? Floor { get; set; }
    public string? Door { get; set; }
}