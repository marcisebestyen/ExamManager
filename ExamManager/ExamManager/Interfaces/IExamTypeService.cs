using ExamManager.Dtos;
using ExamManager.Responses;
using ExamManager.Responses.ExamTypeResponses;

namespace ExamManager.Interfaces;

public interface IExamTypeService
{
    Task<BaseServiceResponse<ExamTypeCreateResponseDto>> CreateExamTypeAsync(ExamTypeCreateDto createRequest);
    Task<BaseServiceResponse<ExamTypeResponseDto>> GetExamTypeByIdAsync(int professionId);
    Task<BaseServiceResponse<bool>> UpdateExamTypeAsync(int professionId, ExamTypeUpdateDto updateRequest);
    Task<BaseServiceResponse<string>> DeleteExamTypeAsync(int examTypeId);
}