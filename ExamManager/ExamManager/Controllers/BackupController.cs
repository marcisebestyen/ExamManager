using ExamManager.Extensions;
using ExamManager.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("api/backups")]
[Authorize(Roles = "Admin")]
public class BackupController : ControllerBase
{
    private readonly IBackupService _backupService;
    private readonly ILogger<BackupController> _logger;

    public BackupController(IBackupService backupService, ILogger<BackupController> logger)
    {
        _backupService = backupService ?? throw new ArgumentNullException(nameof(backupService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpPost("manual")]
    [AllowAnonymous]
    public async Task<IActionResult> PerformManualBackup()
    {
        int operatorId = User.GetId();

        var result = await _backupService.PerformManualBackupAsync(operatorId);

        if (result.Succeeded)
        {
            return Ok(result.Data);
        }
        else
        {
            _logger.LogError("Manual backup failed: {Error}", 
                string.Join(", ", result.Errors ?? new List<string>()));
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = result.Message ?? "An unexpected error occurred during backup.",
                details = result.Errors
            });
        }
    }

    [HttpGet("history")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAllBackups()
    {
        var result = await _backupService.GetAllBackupsAsync();

        if (result.Succeeded)
        {
            return Ok(result.Data);
        }
        else
        {
            switch (result.ErrorCode)
            {
                case "UNEXPECTED_ERROR":
                default:
                    _logger.LogError("Error getting all backups with errors: {Errors}",
                        string.Join(", ", result.Errors));
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new
                        {
                            message = result.Errors.FirstOrDefault() ??
                                      "An unexpected error occurred while retrieving backups."
                        });
            }
        }
    }
    
}