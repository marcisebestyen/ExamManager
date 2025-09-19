using ExamManager.Dtos.OperatorDtos;
using ExamManager.Models;
using ExamManager.Responses;

namespace ExamManager.Interfaces;

public interface IOperatorService
{
    Task<BaseServiceResponse<OperatorLoginResponseDto>> LoginAsync(OperatorLoginRequestDto loginRequest);
    Task<BaseServiceResponse<OperatorRegisterResponseDto>> RegisterAsync(OperatorCreateDto createRequest);
    Task<BaseServiceResponse<OperatorResponseDto>> GetOperatorByIdAsync(int operatorId);
    Task<BaseServiceResponse<IEnumerable<OperatorResponseDto>>> GetAllOperatorsAsync();
    Task<BaseServiceResponse<bool>> UpdateOperatorAsync(int operatorId, OperatorUpdateDto updateRequest);
    Task<BaseServiceResponse<string>> DeleteOperatorAsync(int operatorId, int? deletedById = null);
    Task<BaseServiceResponse<string>> RestoreOperatorAsync(int operatorId);
    Task<BaseServiceResponse<string>> AssignRoleAsync(int targetOperatorId, Role newRole, int assignedById);
}