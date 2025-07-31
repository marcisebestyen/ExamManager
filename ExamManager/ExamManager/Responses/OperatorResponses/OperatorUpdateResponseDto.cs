namespace ExamManager.Responses;

public class OperatorUpdateResponseDto
{
    public bool Succeeded { get; set; }
    public List<string> Errors { get; set; } = new List<string>();

    public static OperatorUpdateResponseDto Success()
    {
        return new OperatorUpdateResponseDto { Succeeded = true };
    }

    public static OperatorUpdateResponseDto Failed(string error)
    {
        return new OperatorUpdateResponseDto { Succeeded = false, Errors = new List<string> { error } };
    }

    public static OperatorUpdateResponseDto Failed(List<string> errors)
    {
        return new OperatorUpdateResponseDto { Succeeded = false, Errors = errors };
    }
}