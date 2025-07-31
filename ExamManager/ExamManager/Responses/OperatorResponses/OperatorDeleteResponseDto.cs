namespace ExamManager.Responses;

public class OperatorDeleteResponseDto
{
    public bool Succeeded { get; set; }
    public List<string> Errors { get; set; } = new  List<string>();
    public string? Message { get; set; }

    public static OperatorDeleteResponseDto Success(string? message)
    {
        return new OperatorDeleteResponseDto
        {
            Succeeded = true,
            Message = message ?? "Operator deleted successfully."
        };
    }

    public static OperatorDeleteResponseDto Failed(string message)
    {
        return new OperatorDeleteResponseDto
        {
            Succeeded = false,
            Errors = new List<string> { message }
        };
    }

    public static OperatorDeleteResponseDto Failed(List<string> errors)
    {
        return new OperatorDeleteResponseDto
        {
            Succeeded = false,
            Errors = errors
        };
    }
}