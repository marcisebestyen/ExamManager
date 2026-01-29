using ExamManager.Extensions;
using ExamManager.Interfaces;
using ExamManager.Models;
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
        var result = await _exportService.ExportExaminersToExcelAsync(null, User.GetId());

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

    [HttpPost("export-examiners-filtered")]
    public async Task<IActionResult> ExportExaminersFiltered([FromBody] List<int> ids)
    {
        var result = await _exportService.ExportExaminersToExcelAsync(ids, User.GetId());

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
        var result = await _exportService.ExportProfessionsToExcelAsync(null, User.GetId());

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

    [HttpPost("export-professions-filtered")]
    public async Task<IActionResult> ExportProfessionsFiltered([FromBody] List<int> ids)
    {
        var result = await _exportService.ExportProfessionsToExcelAsync(ids, User.GetId());

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
        var result = await _exportService.ExportInstitutionsToExcelAsync(null, User.GetId());

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

    [HttpPost("export-institutions-filtered")]
    public async Task<IActionResult> ExportInstitutionsFiltered([FromBody] List<int> ids)
    {
        var result = await _exportService.ExportInstitutionsToExcelAsync(ids, User.GetId());
        
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
        var result = await _exportService.ExportExamTypesToExcelAsync(null, User.GetId());

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

    [HttpPost("export-exam-types-filtered")]
    public async Task<IActionResult> ExportExamTypesFiltered([FromBody] List<int> ids)
    {
        var result = await _exportService.ExportExamTypesToExcelAsync(ids, User.GetId());
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
        var result = await _exportService.ExportExamsToExcelAsync(null, User.GetId());

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

    [HttpPost("export-exams-filtered")]
    public async Task<IActionResult> ExportExamsFiltered([FromBody] List<int> ids)
    {
        var result = await _exportService.ExportExamsToExcelAsync(ids, User.GetId());
        
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