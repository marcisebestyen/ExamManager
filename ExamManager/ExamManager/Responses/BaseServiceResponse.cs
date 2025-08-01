namespace ExamManager.Responses;

public class BaseServiceResponse<TData>
{
    public bool Succeeded { get; set; }
    public List<string> Errors { get; set; } = new List<string>();
    public string? Message { get; set; }
    public TData? Data { get; set; }

    private BaseServiceResponse()
    {
    }

    public static BaseServiceResponse<TData> Success(TData data, string? message = null)
    {
        return new BaseServiceResponse<TData>
        {
            Succeeded = true,
            Data = data,
            Message = message
        };
    }

    public static BaseServiceResponse<TData> Failed(string? message = null)
    {
        return new BaseServiceResponse<TData>
        {
            Succeeded = false,
            Errors = new List<string> { message }
        };
    }

    public static BaseServiceResponse<TData> Failed(List<string> errors)
    {
        return new BaseServiceResponse<TData>
        {
            Succeeded = false,
            Errors = errors
        };
    }
}