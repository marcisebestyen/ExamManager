using ExamManager.Dtos.FileHistoryDtos;
using ExamManager.Responses;

namespace ExamManager.Interfaces;

public interface IFileHistoryService
{
    Task<BaseServiceResponse<FileHistoryResponseDto>> CreateFileHistoryAsync(FileHistoryCreateDto fileHistory);
    Task<BaseServiceResponse<IEnumerable<FileHistoryResponseDto>>> GetAllFileHistoriesAsync();
    Task<BaseServiceResponse<FileDownloadDto>> GetFileContentAsync(int id);
}