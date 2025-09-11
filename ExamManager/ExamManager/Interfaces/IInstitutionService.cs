using ExamManager.Dtos.InstitutionDtos;
using ExamManager.Responses;
using ExamManager.Responses.InstitutionResponses;

namespace ExamManager.Interfaces;

public interface IInstitutionService
{
    Task<BaseServiceResponse<InstitutionCreateResponseDto>> CreateInstitutionAsync(InstitutionCreateDto createRequest);
    Task<BaseServiceResponse<InstitutionResponseDto>> GetInstitutionByIdAsync(int institutionId);
    Task<BaseServiceResponse<IEnumerable<InstitutionResponseDto>>> GetAllInstitutionsAsync();
    Task<BaseServiceResponse<bool>> UpdateInstitutionAsync(int institutionId, InstitutionUpdateDto updateRequest);
    Task<BaseServiceResponse<string>> DeleteInstitutionAsync(int institutionId);
}