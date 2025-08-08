using ExamManager.Dtos.ExamDtos;
using ExamManager.Responses;
using ExamManager.Responses.ExamResponses;

namespace ExamManager.Interfaces;

public interface IExamService
{
    Task<BaseServiceResponse<ExamCreateResponseDto>> CreateExamAsync(ExamCreateDto createRequest, int operatorId);
    Task<BaseServiceResponse<ExamResponseDto>> GetExamByIdAsync(int examId);
    Task<BaseServiceResponse<bool>> UpdateExamAsync(int examId, ExamUpdateDto updateRequest);
    Task<BaseServiceResponse<string>> DeleteExamAsync(int examId, int? deletedById = null);
    Task<BaseServiceResponse<string>> RestoreExamAsync(int examId);
}