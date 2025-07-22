namespace ExamManager.Models;

public class Institution
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int ZipCode { get; set; }
    public string Town  { get; set; } = string.Empty;
    public string Street { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public string? Floor { get; set; }
    public string? Door { get; set; }
}