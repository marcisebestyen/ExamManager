using System.Security.Claims;
using AutoMapper;
using ExamManager.Dtos.ExamDtos;
using ExamManager.Extensions;
using ExamManager.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("api/exams")]
[Authorize]
public class ExamController : ControllerBase
{
    private readonly IExamService _examService;
    private readonly IMapper _mapper;
    private readonly ILogger<ExamController> _logger;

    public ExamController(IExamService examService, IMapper mapper, ILogger<ExamController> logger)
    {
        _examService = examService ?? throw new ArgumentNullException(nameof(examService));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpPost("create-new-exam")]
    public async Task<IActionResult> CreateNewExam([FromBody] ExamCreateDto createRequest)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var operatorId = User.GetId();

        var result = await _examService.CreateExamAsync(createRequest, operatorId);

        if (result.Succeeded)
        {
            return CreatedAtAction(nameof(GetExamById), new { examId = result.Data!.Id }, result.Data);
        }
        else
        {
            switch (result.ErrorCode)
            {
                case "EXAM_CODE_DUPLICATE":
                    return Conflict(new { message = result.Errors.FirstOrDefault() });
                case "BAD_REQUEST_INVALID_FIELDS":
                case "EXAM_BOARD_DETAILS_INVALID":
                    return BadRequest(new { message = result.Errors.FirstOrDefault() });
                case "PROFESSION_NOT_FOUND":
                case "INSTITUTION_NOT_FOUND":
                case "EXAM_TYPE_NOT_FOUND":
                case "EXAMINER_NOT_FOUND":
                    return NotFound(new { message = result.Errors.FirstOrDefault() });
                case "DB_UPDATE_ERROR":
                case "UNEXPECTED_ERROR":
                default:
                    _logger.LogError(
                        "Creation failed for exam: {ExamCode} with errors: {Errors}",
                        createRequest.ExamCode,
                        string.Join(", ", result.Errors)
                    );
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new
                        {
                            message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during creation."
                        });
            }
        }
    }

    [HttpGet("get-exam/{examId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetExamById(int examId)
    {
        var result = await _examService.GetExamByIdAsync(examId);

        if (result.Succeeded)
        {
            return Ok(result.Data);
        }
        else
        {
            switch (result.ErrorCode)
            {
                case "EXAM_NOT_FOUND":
                    return NotFound(new { message = result.Errors.FirstOrDefault() });
                case "UNEXPECTED_ERROR":
                default:
                    _logger.LogError("Error getting exam with id: {Id} with errors: {Errors}", examId,
                        string.Join(", ", result.Errors));
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new
                        {
                            message = result.Errors.FirstOrDefault() ??
                                      "An unexpected error occurred while retrieving exam."
                        });
            }
        }
    }

    [HttpGet("get-all-exams")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAllExams()
    {
        var result = await _examService.GetAllExamsAsync();

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
                    _logger.LogError("Error getting all exams with errors: {Errors}",
                        string.Join(", ", result.Errors));
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new
                        {
                            message = result.Errors.FirstOrDefault() ??
                                      "An unexpected error occurred while retrieving exams."
                        });
            }
        }
    }

    [HttpPatch("update-exam/{examId}")]
    public async Task<IActionResult> UpdateExam(int examId, [FromBody] JsonPatchDocument<ExamUpdateDto> patchDoc)
    {
        if (patchDoc == null)
        {
            return BadRequest(new { message = "The PATCH document cannot be empty." });
        }

        var examGetDtoResult = await _examService.GetExamByIdAsync(examId);

        if (!examGetDtoResult.Succeeded || examGetDtoResult.Data == null)
        {
            return NotFound(new { message = examGetDtoResult.Errors.FirstOrDefault() });
        }

        var examUpdateDto = _mapper.Map<ExamUpdateDto>(examGetDtoResult.Data);

        patchDoc.ApplyTo(examUpdateDto, ModelState);

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _examService.UpdateExamAsync(examId, examUpdateDto);

        if (result.Succeeded)
        {
            return NoContent();
        }

        switch (result.ErrorCode)
        {
            case "EXAM_NOT_FOUND":
            case "PROFESSION_NOT_FOUND":
            case "INSTITUTION_NOT_FOUND":
            case "EXAM_TYPE_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });

            case "EXAM_CODE_DUPLICATE":
            case "CONCURRENCY_ERROR":
                return Conflict(new { message = result.Errors.FirstOrDefault() });

            case "PROFESSION_ID_INVALID":
            case "INSTITUTION_ID_INVALID":
            case "EXAM_TYPE_ID_INVALID":
                return BadRequest(new { message = result.Errors.FirstOrDefault() });

            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger?.LogError("UpdateExam (PATCH) failed for exam {ExamId} with errors: {Errors}", examId,
                    string.Join(", ", result.Errors));
                return StatusCode(500,
                    new { message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during update." });
        }
    }

    [HttpDelete("delete-exam/{examId}")]
    public async Task<IActionResult> DeleteExam(int examId)
    {
        var deletedById = User.GetId();

        var result = await _examService.DeleteExamAsync(examId, deletedById);

        if (result.Succeeded)
        {
            return NoContent();
        }
        else
        {
            switch (result.ErrorCode)
            {
                case "EXAM_NOT_FOUND":
                    return NotFound(new { message = result.Errors.FirstOrDefault() });
                case "EXAM_ALREADY_DELETED":
                case "CONCURRENCY_ERROR":
                    return Conflict(new { message = result.Errors.FirstOrDefault() });
                case "DB_UPDATE_ERROR":
                case "UNEXPECTED_ERROR":
                default:
                    _logger.LogError("Error deleting exam with id: {Id} with errors: {Errors}", examId,
                        string.Join(", ", result.Errors));
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new
                        {
                            message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during deletion."
                        });
            }
        }
    }

    [HttpPost("restore-exam/{examId}")]
    public async Task<IActionResult> RestoreExam(int examId)
    {
        var result = await _examService.RestoreExamAsync(examId);

        if (result.Succeeded)
        {
            return Ok(new { message = result.Message }); 
        }
        else
        {
            switch (result.ErrorCode)
            {
                case "EXAM_NOT_FOUND":
                    return NotFound(new { message = result.Errors.FirstOrDefault() });
                case "EXAM_ALREADY_RESTORED":
                case "CONCURRENCY_ERROR":
                    return Conflict(new { message = result.Errors.FirstOrDefault() });
                case "DB_UPDATE_ERROR":
                case "UNEXPECTED_ERROR":
                default:
                    _logger.LogError("Error restoring exam with id: {Id} with errors: {Errors}", examId,
                        string.Join(", ", result.Errors));
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new
                        {
                            message = result.Errors.FirstOrDefault() ??
                                      "An unexpected error occurred during restoration."
                        });
            }
        }
    }

    [HttpGet("upcoming-exams")]
    [AllowAnonymous]
    public async Task<IActionResult> GetUpcomingExams([FromQuery] int daysAhead = 3)
    {
        if (daysAhead <= 0)
        {
            daysAhead = 3;
        }
        
        var result = await _examService.GetUpcomingExamsAsync(daysAhead);

        if (result.Succeeded)
        {
            return Ok(result.Data);
        }
        else
        {
            _logger.LogError("Error getting upcoming exams: {Errors}", string.Join(", ", result.Errors));
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred."
            });
        }
    }

    [HttpGet("generate-exam-board-report/{examId}")]
    public async Task<IActionResult> GenerateExamBoardReport(int examId)
    {
        var result = await _examService.GenerateExamBoardReportAsync(examId);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }
        
        return File(result.Data, "application/pdf", $"ExamBoardReport_Exam_{examId}.pdf");
    }
}