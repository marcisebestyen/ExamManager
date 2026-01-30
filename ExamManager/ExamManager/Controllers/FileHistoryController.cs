using ExamManager.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("api/file-history")]
[Authorize]
public class FileHistoryController : ControllerBase
{
    private readonly IFileHistoryService _fileHistoryService;
    private readonly ILogger<FileHistoryController> _logger;

    public FileHistoryController(IFileHistoryService fileHistoryService, ILogger<FileHistoryController> logger)
    {
        _fileHistoryService = fileHistoryService ?? throw new ArgumentNullException(nameof(fileHistoryService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpGet("get-all")]
    public async Task<IActionResult> GetAllFileHistory()
    {
        var result = await _fileHistoryService.GetAllFileHistoriesAsync();

        if (result.Succeeded)
        {
            return Ok(result.Data);
        }

        _logger.LogError("Failed to fetch file history: {Errors}", string.Join(", ", result.Errors));
        return StatusCode(StatusCodes.Status500InternalServerError, new
        {
            message = result.Errors.FirstOrDefault() ?? "An error occurred while fetching file history."
        });
    }

    [HttpGet("download/{id}")]
    public async Task<IActionResult> DownloadFile(int id)
    {
        if (id <= 0) return BadRequest("Invalid File ID.");

        var result = await _fileHistoryService.GetFileContentAsync(id);

        if (result.Succeeded && result.Data != null)
        {
            var fileData = result.Data;
            
            return File(fileData.FileContent, fileData.ContentType, fileData.FileName);
        }

        switch (result.ErrorCode)
        {
            case "FILE_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            default:
                _logger.LogError("Download failed for ID {Id}: {Errors}", id, string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "An error occurred while downloading the file."
                });
        }
    }
}