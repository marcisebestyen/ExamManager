using ExamManager.Dtos.OperatorDtos;
using ExamManager.Responses;

namespace ExamManager.Interfaces;

public interface IOperatorService
{
    Task<OperatorLoginResponseDto?> LoginAsync(OperatorLoginRequestDto loginRequest);
    Task<OperatorRegisterResponseDto> RegisterAsync(OperatorCreateDto createRequest);
    Task<bool> UserExistsAsync(string userName);
    Task<OperatorResponseDto?> GetOperatorByIdAsync(int id);
    Task<OperatorUpdateResponseDto> UpdateOperatorAsync(int operatorId,  OperatorUpdateDto updateRequest);
    Task<OperatorDeleteResponseDto> DeleteOperatorAsync(int operatorId, int? deletedById = null);
    Task<OperatorRestoreResponseDto> RestoreOperatorAsync(int operatorId);
}