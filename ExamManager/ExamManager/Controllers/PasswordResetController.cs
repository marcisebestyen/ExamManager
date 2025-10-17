using ExamManager.Dtos.PasswordResetDtos;
using ExamManager.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("api/password_reset")]
public class PasswordResetController : ControllerBase
{
    private readonly IPasswordResetService _passwordResetService;
    private readonly ILogger<PasswordResetController> _logger;

    public PasswordResetController(IPasswordResetService passwordResetService, ILogger<PasswordResetController> logger)
    {
        _passwordResetService = passwordResetService ?? throw new ArgumentNullException(nameof(passwordResetService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }
    
    [HttpPost("initiate")]
    [AllowAnonymous]
    public async Task<IActionResult> InitiatePasswordReset([FromBody] InitiatePasswordResetRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (string.IsNullOrWhiteSpace(request.UserName))
        {
            return BadRequest(new { message = "Username is required." });
        }

        var result = await _passwordResetService.InitiatePasswordResetAsync(request.UserName);

        if (result.Succeeded)
        {
            return Ok(new { message = result.Message });
        }

        switch (result.ErrorCode)
        {
            case "USERNAME_REQUIRED":
            case "USER_NOT_FOUND":
                // For security reasons, return a generic message to avoid user enumeration
                return Ok(new { message = "If the user exists and has an email address, a password reset token has been sent." });
            case "EMAIL_NOT_FOUND":
                return BadRequest(new { message = result.Errors.FirstOrDefault() });
            case "PASSWORD_RESET_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("InitiatePasswordReset failed for username: {UserName} with errors: {Errors}",
                    request.UserName, string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during password reset initiation."
                    });
        }
    }
    
    [HttpPost("reset")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] PasswordResetRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { message = "Token and new password are required." });
        }

        var result = await _passwordResetService.ValidateAndResetPasswordAsync(request.Token, request.NewPassword);

        if (result.Succeeded)
        {
            return Ok(new { message = result.Message });
        }

        switch (result.ErrorCode)
        {
            case "INVALID_TOKEN_OR_PASSWORD":
            case "INVALID_TOKEN":
                return BadRequest(new { message = result.Errors.FirstOrDefault() });
            case "TOKEN_REVOKED":
                return BadRequest(new { message = result.Errors.FirstOrDefault() });
            case "USER_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("ResetPassword failed with token ending in ...{TokenSuffix} with errors: {Errors}",
                    request.Token?.Length > 3 ? request.Token.Substring(request.Token.Length - 3) : "???",
                    string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during password reset."
                    });
        }
    }

}