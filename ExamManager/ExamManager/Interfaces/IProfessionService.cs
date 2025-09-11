using ExamManager.Dtos.ProfessionDtos;
using ExamManager.Responses;
using ExamManager.Responses.ProfessionResponses;

namespace ExamManager.Interfaces;

public interface IProfessionService
{
    Task<BaseServiceResponse<ProfessionCreateResponseDto>> CreateProfessionAsync(ProfessionCreateDto createRequest);
    Task<BaseServiceResponse<ProfessionResponseDto>> GetProfessionByIdAsync(int professionId);
    Task<BaseServiceResponse<IEnumerable<ProfessionResponseDto>>> GetAllProfessionsAsync();
    Task<BaseServiceResponse<bool>> UpdateProfessionAsync(int professionId, ProfessionUpdateDto updateRequest);
    Task<BaseServiceResponse<string>> DeleteProfessionAsync(int professionId);
}