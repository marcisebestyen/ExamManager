using AutoMapper;
using ExamManager.Dtos;
using ExamManager.Interfaces;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("api/exam_types")]
public class ExamTypeController : ControllerBase
{
    private readonly IExamTypeService _examTypeService;
    private readonly IMapper _mapper;
    private readonly ILogger<ExamTypeController> _logger;

    public ExamTypeController(IExamTypeService examTypeService, IMapper mapper, ILogger<ExamTypeController> logger)
    {
        _examTypeService = examTypeService ?? throw new ArgumentNullException(nameof(examTypeService));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpPost("create-new-exam-type")]
    public async Task<IActionResult> CreateNewExamType([FromBody] ExamTypeCreateDto createRequest)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _examTypeService.CreateExamTypeAsync(createRequest);

        if (result.Succeeded)
        {
            return CreatedAtAction(nameof(GetExamTypeById), new { examTypeId = result.Data!.Id }, result.Data);
        }
        else
        {
            switch (result.ErrorCode)
            {
                case "EXAM_TYPE_NAME_DUPLICATE":
                    return Conflict(new { message = result.Errors.FirstOrDefault() });
                case "BAD_REQUEST_INVALID_FIELDS":
                    return BadRequest(new { message = result.Errors.FirstOrDefault() });
                case "DB_UPDATE_ERROR":
                case "UNEXPECTED_ERROR":
                default:
                    _logger.LogError(
                        "Creation failed for exam type: {ExamTypeName} with errors: {Errors}",
                        createRequest.TypeName,
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

    [HttpPatch("update-exam-type/{examTypeId}")]
    public async Task<IActionResult> UpdateExamType(int examTypeId,
        [FromBody] JsonPatchDocument<ExamTypeUpdateDto> patchDoc)
    {
        if (patchDoc == null)
        {
            return BadRequest(new { message = "The PATCH document cannot be empty." });
        }

        var examTypeGetDtoResult = await _examTypeService.GetExamTypeByIdAsync(examTypeId);

        if (!examTypeGetDtoResult.Succeeded || examTypeGetDtoResult.Data == null)
        {
            return NotFound(new { message = examTypeGetDtoResult.Errors.FirstOrDefault() });
        }

        var examTypePatchDto = _mapper.Map<ExamTypeUpdateDto>(examTypeGetDtoResult.Data);

        patchDoc.ApplyTo(examTypePatchDto);

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        TryValidateModel(examTypePatchDto);
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _examTypeService.UpdateExamTypeAsync(examTypeId, examTypePatchDto);

        if (result.Succeeded)
        {
            return NoContent();
        }

        switch (result.ErrorCode)
        {
            case "EXAM_TYPE_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "EXAM_TYPE_NAME_DUPLICATE":
            case "CONCURRENCY_ERROR":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("UpdateExamType (PATCH) failed for exam type {ExamTypeId} with errors: {Errors}",
                    examTypeId, string.Join(", ", result.Errors));
                return StatusCode(500,
                    new { message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during update." });
        }
    }

    [HttpGet("get-exam-type/{examTypeId}")]
    public async Task<IActionResult> GetExamTypeById(int examTypeId)
    {
        var result = await _examTypeService.GetExamTypeByIdAsync(examTypeId);

        if (result.Succeeded)
        {
            return Ok(result.Data);
        }
        else
        {
            switch (result.ErrorCode)
            {
                case "EXAM_TYPE_NOT_FOUND":
                    return NotFound(new { message = result.Errors.FirstOrDefault() });
                case "UNEXPECTED_ERROR":
                default:
                    _logger.LogError("Error getting exam type with id: {Id} with errors: {Errors}", examTypeId,
                        string.Join(", ", result.Errors));
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new
                        {
                            message = result.Errors.FirstOrDefault() ??
                                      "An unexpected error occurred while retrieving exam type."
                        });
            }
        }
    }

    [HttpDelete("delete-exam-type/{examTypeId}")]
    public async Task<IActionResult> DeleteExamType(int examTypeId)
    {
        if (examTypeId <= 0)
        {
            return BadRequest(new { Message = "Invalid exam type ID." });
        }

        var result = await _examTypeService.DeleteExamTypeAsync(examTypeId);

        if (result.Succeeded)
        {
            return Ok(new { message = result.Message });
        }

        switch (result.ErrorCode)
        {
            case "EXAM_TYPE_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "CONCURRENCY_ERROR":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("DeleteExamType failed for ID {ExamTypeId} with errors: {Errors}", examTypeId,
                    string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ??
                                  "An unknown error happened during the deletion of the exam type."
                    });
        }
    }
}