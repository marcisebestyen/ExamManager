namespace ExamManager.Dtos.FileHistoryDtos;

public class FileDownloadDto
{
    public string FileName { get; set; }
    public string ContentType { get; set; }
    public byte[] FileContent { get; set; }
}