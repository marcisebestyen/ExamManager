using ExamManager.Responses;

namespace ExamManager.Interfaces;

public interface IPasswordResetService
{
    Task<BaseServiceResponse<bool>> InitiatePasswordResetAsync(string userName);
    Task<BaseServiceResponse<bool>> ValidateAndResetPasswordAsync(string token, string newPassword);
    Task RevokeExpiredTokensAsync();
}