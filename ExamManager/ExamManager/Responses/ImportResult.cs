namespace ExamManager.Responses;

public class ImportResult
{
    public int SuccessCount { get; set; }
    public List<string> Errors { get; set; } = new List<string>();
}