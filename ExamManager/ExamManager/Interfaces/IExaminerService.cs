using ExamManager.Dtos.ExaminerDtos;
using ExamManager.Responses;
using ExamManager.Responses.ExaminerResponses;

namespace ExamManager.Interfaces;

public interface IExaminerService
{
    Task<BaseServiceResponse<ExaminerCreateResponseDto>> CreateExaminerAsync(ExaminerCreateDto createRequest);
    Task<BaseServiceResponse<ExaminerResponseDto>> GetExaminerByIdAsync(int examinerId);
    Task<BaseServiceResponse<bool>> UpdateExaminerAsync(int examinerId, ExaminerUpdateDto updateRequest);
    Task<BaseServiceResponse<string>> DeleteExaminerAsync(int examinerId, int? deletedById = null);
    Task<BaseServiceResponse<string>> RestoreExaminerAsync(int examinerId);
}