using ExamManager.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("api/export")]
[Authorize]
public class ExportController : ControllerBase
{
    private readonly IExportService _exportService;
    private readonly ILogger<ExportController> _logger;

    public ExportController(IExportService exportService, ILogger<ExportController> logger)
    {
        _exportService = exportService ?? throw new ArgumentNullException(nameof(exportService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }
    
    [HttpGet("export-examiners")]
    public async Task<IActionResult> ExportExaminers()
    {
        var result = await _exportService.ExportExaminersToExcelAsync();

        if (result.Succeeded)
        {
            var fileName = $"Examiners_{DateTime.Now:yyyyMMdd_HHmm}.xlsx";
            var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            return File(result.Data, contentType, fileName);
        }
        else
        {
            _logger.LogError("Export failed for examiners: {Errors}", string.Join(", ", result.Errors));
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during export."
            });
        }
    }
    
    [HttpGet("export-professions")]
    public async Task<IActionResult> ExportProfessions()
    {
        var result = await _exportService.ExportProfessionsToExcelAsync();

        if (result.Succeeded)
        {
            var fileName = $"Professions_{DateTime.Now:yyyyMMdd_HHmm}.xlsx";
            var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            return File(result.Data, contentType, fileName);
        }
        else
        {
            _logger.LogError("Export failed for professions: {Errors}", string.Join(", ", result.Errors));
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during export."
            });
        }
    }
    
    [HttpGet("export-institutions")]
    public async Task<IActionResult> ExportInstitutions()
    {
        var result = await _exportService.ExportInstitutionsToExcelAsync();

        if (result.Succeeded)
        {
            var fileName = $"Institutions_{DateTime.Now:yyyyMMdd_HHmm}.xlsx";
            var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            return File(result.Data, contentType, fileName);
        }
        else
        {
            _logger.LogError("Export failed for institutions: {Errors}", string.Join(", ", result.Errors));
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during export."
            });
        }
    }
    
    [HttpGet("export-exam-types")]
    public async Task<IActionResult> ExportExamTypes()
    {
        var result = await _exportService.ExportExamTypesToExcelAsync();

        if (result.Succeeded)
        {
            var fileName = $"ExamTypes_{DateTime.Now:yyyyMMdd_HHmm}.xlsx";
            var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            return File(result.Data, contentType, fileName);
        }
        else
        {
            _logger.LogError("Export failed for exam types: {Errors}", string.Join(", ", result.Errors));
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during export."
            });
        }
    }
    
    [HttpGet("export-exams")]
    public async Task<IActionResult> ExportExams()
    {
        var result = await _exportService.ExportExamsToExcelAsync();

        if (result.Succeeded)
        {
            var fileName = $"Exams_{DateTime.Now:yyyyMMdd_HHmm}.xlsx";
            var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            return File(result.Data, contentType, fileName);
        }
        else
        {
            _logger.LogError("Export failed for exams: {Errors}", string.Join(", ", result.Errors));
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during export."
            });
        }
    }
}