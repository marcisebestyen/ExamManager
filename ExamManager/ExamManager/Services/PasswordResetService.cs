using ExamManager.Interfaces;
using ExamManager.Models;
using ExamManager.Repositories;
using ExamManager.Responses;
using Microsoft.EntityFrameworkCore;

namespace ExamManager.Services;

public class PasswordResetService : IPasswordResetService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<PasswordResetService> _logger;
    private readonly IEmailService _emailService;
    private const int TokenExpirationMinutes = 10;

    public PasswordResetService(IUnitOfWork unitOfWork, ILogger<PasswordResetService> logger,
        IEmailService emailService)
    {
        _unitOfWork = unitOfWork ??  throw new ArgumentNullException(nameof(unitOfWork));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
    }

    public async Task<BaseServiceResponse<bool>> InitiatePasswordResetAsync(string userName)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(userName))
            {
                _logger.LogWarning("Password reset initiated with empty username");
                return BaseServiceResponse<bool>.Failed("Username is required", "USERNAME_REQUIRED");
            }
            
            var operatorEntity = (await _unitOfWork.OperatorRepository.GetAsync(u => u.UserName == userName)).FirstOrDefault();

            if (operatorEntity == null)
            {
                _logger.LogWarning("Password reset initiated for non-existent user: {UserName}", userName);
                return BaseServiceResponse<bool>.Failed("User not found", "USER_NOT_FOUND");
            }

            // if (string.IsNullOrWhiteSpace(operatorEntity.Email))
            // {
            //     _logger.LogWarning("Password reset attempted for user without email: {UserName}", userName);
            //     return BaseServiceResponse<bool>.Failed(
            //         "This account does not have an email address associated with it. Please contact an administrator to reset your password.",
            //         "EMAIL_NOT_FOUND");
            // }

            var existingTokens =
                await _unitOfWork.PasswordResetRepository.GetAsync(pr => pr.OperatorId == operatorEntity.Id && !pr.IsRevoked);

            foreach (var oldToken in existingTokens)
            {
                oldToken.IsRevoked = true;
                await _unitOfWork.PasswordResetRepository.UpdateAsync(oldToken);
            }

            var token = GenerateSecureToken();
            var now = DateTime.UtcNow;

            var passwordReset = new PasswordReset
            {
                OperatorId = operatorEntity.Id,
                Token = token,
                RequestedAt = now,
                ExpiredAt = now.AddMinutes(TokenExpirationMinutes),
                UsedAt = null,
                IsRevoked = false
            };

            await _unitOfWork.PasswordResetRepository.InsertAsync(passwordReset);
            await _unitOfWork.SaveAsync();

            var emailSubject = "Password Reset Confirmation";
            var emailBody = $@"
                <html>
                <body>
                    <h2>Password reset</h2>
                    <p>Hi {operatorEntity.UserName ?? "User"},</p>
                    <p>Here's your token to reset your password:</p>
                    <h3 style='background-color: #f0f0f0; padding: 10px; display: inline-block;'>{token}</h3>
                    <p>This token {TokenExpirationMinutes} is available for 10 minutes.</p>
                    <p>If you haven't initiated the confirmation, ignore this email.</p>
                </body>
                </html>";

            await _emailService.SendEmailAsync(operatorEntity.UserName, emailSubject, emailBody);

            _logger.LogInformation("Password reset token generated and sent for user: {Email}", userName);
            return BaseServiceResponse<bool>.Success(true, "Password reset confirmation sent to your email address.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initiating password reset for user: {Email}", userName);
            return BaseServiceResponse<bool>.Failed("An error occured during resetting password.",
                "PASSWORD_RESET_ERROR");
        }
    }

    public async Task<BaseServiceResponse<bool>> ValidateAndResetPasswordAsync(string token, string newPassword)
    {
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(newPassword))
        {
            _logger.LogWarning("ValidateAndResetPasswordAsync called with empty token or password.");
            return BaseServiceResponse<bool>.Failed("You must provide a valid token and password.",
                "INVALID_TOKEN_OR_PASSWORD");
        }

        try
        {
            var passwordReset = (await _unitOfWork.PasswordResetRepository.GetAsync(pr => pr.Token == token))
                .FirstOrDefault();

            if (passwordReset == null)
            {
                _logger.LogWarning("Invalid password reset token attempted: {Token}", token);
                return BaseServiceResponse<bool>.Failed("Invalid token.", "INVALID_TOKEN");
            }

            if (passwordReset.IsRevoked)
            {
                _logger.LogWarning("Revoked token attempted for user ID: {UserId}", passwordReset.OperatorId);
                return BaseServiceResponse<bool>.Failed("This token is already revoked.", "TOKEN_REVOKED");
            }

            if (DateTime.UtcNow > passwordReset.ExpiredAt)
            {
                _logger.LogWarning("Expired token attempted for user ID: {UserId}", passwordReset.OperatorId);
                passwordReset.IsRevoked = true;
                await _unitOfWork.PasswordResetRepository.UpdateAsync(passwordReset);
                await _unitOfWork.SaveAsync();
                return BaseServiceResponse<bool>.Failed("This token has been revoked.", "TOKEN_REVOKED");
            }

            var operatorEntity = (await _unitOfWork.OperatorRepository.GetAsync(u => u.Id == passwordReset.OperatorId))
                .FirstOrDefault();

            if (operatorEntity == null)
            {
                _logger.LogError("User not found for valid password reset token. User ID: {UserId}",
                    passwordReset.OperatorId);
                return BaseServiceResponse<bool>.Failed("The operator was not found.", "USER_NOT_FOUND");
            }

            operatorEntity.Password = BCrypt.Net.BCrypt.HashPassword(newPassword);
            await _unitOfWork.OperatorRepository.UpdateAsync(operatorEntity);

            passwordReset.UsedAt = DateTime.UtcNow;
            passwordReset.IsRevoked = true;
            await _unitOfWork.PasswordResetRepository.UpdateAsync(passwordReset);

            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Password successfully reset for user ID: {UserId}", operatorEntity.Id);
            return BaseServiceResponse<bool>.Success(true, "Password successfully reset.");
        }
        catch (DbUpdateException dbEx)
        {
            _logger.LogError(dbEx, "Database error during password reset with token: {Token}", token);
            return BaseServiceResponse<bool>.Failed(
                $"Database error: {dbEx.InnerException?.Message ?? dbEx.Message}", "DB_UPDATE_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during password reset with token: {Token}", token);
            return BaseServiceResponse<bool>.Failed("Unexpected error during password reset.",
                "UNEXPECTED_ERROR");
        }
    }

    public async Task RevokeExpiredTokensAsync()
    {
        try
        {
            var expiredTokens =
                await _unitOfWork.PasswordResetRepository.GetAsync(pr => !pr.IsRevoked && DateTime.UtcNow > pr.ExpiredAt
                );

            foreach (var token in expiredTokens)
            {
                token.IsRevoked = true;
                await _unitOfWork.PasswordResetRepository.UpdateAsync(token);
            }

            if (expiredTokens.Any())
            {
                await _unitOfWork.SaveAsync();
                _logger.LogInformation("Revoked {Count} expired password reset tokens", expiredTokens.Count());
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking expired tokens");
        }
    }

    private string GenerateSecureToken()
    {
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
        {
            var bytes = new byte[4];
            rng.GetBytes(bytes);
            var randomNumber = BitConverter.ToUInt32(bytes, 0);
            return (randomNumber % 1000000).ToString("D6");
        }
    }
}