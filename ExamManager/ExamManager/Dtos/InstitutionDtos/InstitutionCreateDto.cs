namespace ExamManager.Dtos.InstitutionDtos;

public class InstitutionCreateDto
{
    public string Name { get; set; }
    public int ZipCode { get; set; }
    public string Town  { get; set; }
    public string Street { get; set; }
    public string Number { get; set; }
    public string? Floor { get; set; }
    public string? Door { get; set; }
}