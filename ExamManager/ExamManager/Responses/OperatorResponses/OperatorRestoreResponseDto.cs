namespace ExamManager.Responses;

public class OperatorRestoreResponseDto
{
    public bool Succeeded { get; set; }
    public List<string> Errors { get; set; } = new  List<string>();
    public string? Message { get; set; }

    public static OperatorRestoreResponseDto Success(string? message)
    {
        return new OperatorRestoreResponseDto
        {
            Succeeded = true,
            Message = message
        };
    }

    public static OperatorRestoreResponseDto Failed(string message)
    {
        return new OperatorRestoreResponseDto
        {
            Succeeded = false,
            Errors = new List<string> { message }
        };
    }

    public static OperatorRestoreResponseDto Failed(List<string> errors)
    {
        return new OperatorRestoreResponseDto
        {
            Succeeded = false,
            Errors = errors
        };
    }
}