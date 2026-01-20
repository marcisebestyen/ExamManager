using ExamManager.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("api/import")]
[Authorize]
public class ImportController : ControllerBase
{
    private readonly IImportService _importService;
    private readonly ILogger<ImportController> _logger;

    public ImportController(IImportService importService, ILogger<ImportController> logger)
    {
        _importService = importService ?? throw new ArgumentNullException(nameof(importService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpGet("template-exam-types")]
    public IActionResult DownloadExamTypesTemplate()
    {
        var fileContent = _importService.GenerateExamTypesImportTemplate();

        var fileName = "ExamTypes_Import_Template.xlsx";
        var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        return File(fileContent, contentType, fileName);
    }

    [HttpPost("import-exam-types")]
    public async Task<IActionResult> ImportExamTypes(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }

        using var stream = file.OpenReadStream();

        var result = await _importService.ImportExamTypesFromExcelAsync(stream);

        if (result.Succeeded)
        {
            return Ok(result.Data);
        }
        else
        {
            _logger.LogError("Import failed for exam types: {Errors}",
                string.Join(", ", result.Errors ?? new List<string>()));
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = result.Message ?? "An unexpected error occurred during import.",
                details = result.Data?.Errors
            });
        }
    }
}