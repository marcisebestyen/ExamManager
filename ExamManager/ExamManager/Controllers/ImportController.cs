using System.Security.Claims;
using ExamManager.Extensions;
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

    [HttpGet("template-exams")]
    public async Task<IActionResult> DownloadExamsTemplate()
    {
        var filecontent = await _importService.GenerateExamsImportTemplate(User.GetId());
        
        var fileName = "Exams_Import_Template.xlsx";
        var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        
        return File(filecontent, contentType, fileName);
    }
    
    [HttpGet("template-examiners")]
    public async Task<IActionResult> DownloadExaminersTemplate()
    {
        var fileContent = await _importService.GenerateExaminersImportTemplate(User.GetId());
        
        var fileName = "Examiners_Import_Template.xlsx";
        var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        
        return File(fileContent, contentType, fileName);
    }

    [HttpGet("template-exam-types")]
    public async Task<IActionResult> DownloadExamTypesTemplate()
    {
        var fileContent = await _importService.GenerateExamTypesImportTemplate(User.GetId());

        var fileName = "ExamTypes_Import_Template.xlsx";
        var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        return File(fileContent, contentType, fileName);
    }

    [HttpGet("template-institutions")]
    public async Task<IActionResult> DownloadInstitutionsTemplate()
    {
        var fileContent = await _importService.GenerateInstitutionsImportTemplate(User.GetId());
        
        var fileName = "Institutions_Import_Template.xlsx";
        var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        
        return File(fileContent, contentType, fileName);
    }

    [HttpGet("template-professions")]
    public async Task<IActionResult> DownloadProfessionTemplate()
    {
        var fileContent = await _importService.GenerateProfessionsImportTemplate(User.GetId());
        
        var fileName = "Professions_Import_Template.xlsx";
        var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        
        return File(fileContent, contentType, fileName);
    }

    [HttpPost("import-exams")]
    public async Task<IActionResult> ImportExams(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }
        
        var stream = file.OpenReadStream();
        
        var result = await _importService.ImportExamsFromExcelAsync(stream, User.GetId());
        
        if (result.Succeeded)
        {
            return Ok(result.Data);
        }
        else
        {
            _logger.LogError("Import failed for exams: {Errors}",
                string.Join(", ", result.Errors ?? new List<string>()));
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = result.Message ?? "An unexpected error occurred during import.",
                details = result.Data?.Errors
            });
        }
    }

    [HttpPost("import-examiners")]
    public async Task<IActionResult> ImportExaminers(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }
        
        using var stream = file.OpenReadStream();
        
        var result = await _importService.ImportExaminersFromExcelAsync(stream, User.GetId());
        
        if (result.Succeeded)
        {
            return Ok(result.Data);
        }
        else
        {
            _logger.LogError("Import failed for examiners: {Errors}",
                string.Join(", ", result.Errors ?? new List<string>()));
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = result.Message ?? "An unexpected error occurred during import.",
                details = result.Data?.Errors
            });
        }
    }

    [HttpPost("import-exam-types")]
    public async Task<IActionResult> ImportExamTypes(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }

        using var stream = file.OpenReadStream();

        var result = await _importService.ImportExamTypesFromExcelAsync(stream, User.GetId());

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

    [HttpPost("import-institutions")]
    public async Task<IActionResult> ImportInstitutions(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }
        
        using var stream = file.OpenReadStream();
        
        var result = await _importService.ImportInstitutionsFromExcelAsync(stream, User.GetId());
        
        if (result.Succeeded)
        {
            return Ok(result.Data);
        }
        else
        {
            _logger.LogError("Import failed for institutions: {Errors}",
                string.Join(", ", result.Errors ?? new List<string>()));
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = result.Message ?? "An unexpected error occurred during import.",
                details = result.Data?.Errors
            });
        }
    }

    [HttpPost("import-professions")]
    public async Task<IActionResult> ImportProfessions(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }
        
        using var stream = file.OpenReadStream();
        
        var result = await _importService.ImportProfessionsFromExcelAsync(stream, User.GetId());

        if (result.Succeeded)
        {
            return Ok(result.Data);
        }
        else
        {
            _logger.LogError("Import failed for professions: {Errors}",
                string.Join(", ", result.Errors ?? new List<string>()));
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = result.Message ?? "An unexpected error occurred during import.",
                details = result.Data?.Errors
            });
        }
    }
}