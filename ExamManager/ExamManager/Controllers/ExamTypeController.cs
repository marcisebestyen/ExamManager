using AutoMapper;
using ExamManager.Dtos;
using ExamManager.Interfaces;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("examTypes")]
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
            string firstError = result.Errors.FirstOrDefault()?.ToLowerInvariant() ?? "";

            if (firstError.Contains("type name") && firstError.Contains("already taken"))
            {
                return Conflict(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            if (firstError.Contains("compulsory fields are required"))
            {
                return BadRequest(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            _logger.LogError(
                "Creation failed for exam type: {ExamTypeId} with errors: {Errors}",
                createRequest.TypeName,
                string.Join(", ", result.Errors)
            );
            return StatusCode(StatusCodes.Status500InternalServerError,
                new
                {
                    message = result.Message ?? "An unexpected error occured during creation",
                    errors = result.Errors
                });
        }
    }

    [HttpPatch("update-exam-type/{examTypeId}")]
    public async Task<IActionResult> UpdateExamType(int examTypeId,
        [FromBody] JsonPatchDocument<ExamTypeUpdateDto> patchDoc)
    {
        try
        {
            if (patchDoc == null)
            {
                return BadRequest(new { Message = "The PATCH document cannot be empty." });
            }

            var examTypeGetDtoResult = await _examTypeService.GetExamTypeByIdAsync(examTypeId);

            if (!examTypeGetDtoResult.Succeeded || examTypeGetDtoResult.Data == null)
            {
                return NotFound(new
                    { message = examTypeGetDtoResult.Message ?? examTypeGetDtoResult.Errors.FirstOrDefault() });
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

            if (result.Errors.Any())
            {
                string firstError = result.Errors.FirstOrDefault()?.ToLowerInvariant() ?? "";

                if (firstError.Contains("cannot be found"))
                {
                    return NotFound(new { Errors = result.Errors });
                }

                if (firstError.Contains("changed the data") || firstError.Contains("concurrency"))
                {
                    return Conflict(new { Errors = result.Errors });
                }

                return BadRequest(new { Errors = result.Errors });
            }

            _logger?.LogError("UpdateExamType (PATCH) failed for exam type {ExamTypeId} without specific errors.",
                examTypeId);
            return StatusCode(500, new { message = "An unexpected error occurred during update." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating exam type");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An unexpected error occurred during the update operation." });
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
            string firstError = result.Errors.FirstOrDefault()?.ToLowerInvariant() ?? "";
            if (firstError.Contains("cannot be found"))
            {
                return NotFound(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            _logger.LogError("Error getting exam type with id: {Id} with errors: {Errors}", examTypeId,
                string.Join(", ", result.Errors));
            return StatusCode(StatusCodes.Status500InternalServerError,
                new
                {
                    message = result.Message ?? "An error occured while retrieving exam type.", errors = result.Errors
                });
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

        if (result.Errors.Any())
        {
            string firstError = result.Errors.First().ToLowerInvariant();

            if (firstError.Contains("cannot be found") || firstError.Contains("not found"))
            {
                return NotFound(new { Errors = result.Errors });
            }

            if (firstError.Contains("has since been") || firstError.Contains("modified") ||
                firstError.Contains("concurrency"))
            {
                return Conflict(new { Errors = result.Errors });
            }

            return BadRequest(new { message = result.Errors });
        }

        _logger.LogError("DeleteExamType failed for ID {ExamTypeId} without specific errors.", examTypeId);
        return StatusCode(StatusCodes.Status500InternalServerError,
            new { message = "An unknown error happened during the deletion of the exam type." });
    }
}