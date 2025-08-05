using System.Security.Claims;
using AutoMapper;
using ExamManager.Dtos.ExaminerDtos;
using ExamManager.Interfaces;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("examiners")]
public class ExaminerController : ControllerBase
{
    private readonly IExaminerService _examinerService;
    private readonly ILogger<ExaminerController> _logger;
    private readonly IMapper _mapper;

    public ExaminerController(IExaminerService examinerService, ILogger<ExaminerController> logger, IMapper mapper)
    {
        _examinerService = examinerService ?? throw new ArgumentNullException(nameof(examinerService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
    }

    [HttpPost("create-new-examiner")]
    public async Task<IActionResult> CreateNewExaminer([FromBody] ExaminerCreateDto createRequest)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _examinerService.CreateExaminerAsync(createRequest);

        if (result.Succeeded)
        {
            return CreatedAtAction(nameof(GetExaminerById), new { examinerId = result.Data!.Id }, result.Data);
        }
        else
        {
            string firstError = result.Errors.FirstOrDefault()?.ToLowerInvariant() ?? "";

            if (firstError.Contains("identity card number") && firstError.Contains("already taken"))
            {
                return Conflict(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            if (firstError.Contains("all fields are required"))
            {
                return BadRequest(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            _logger.LogError(
                "Creation failed for examiner: {IDCardNumber} with errors: {Errors}",
                createRequest.IdentityCardNumber,
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

    [HttpPatch("update-examiner/{examinerId}")]
    public async Task<IActionResult> UpdateExaminer(int examinerId,
        [FromBody] JsonPatchDocument<ExaminerUpdateDto> patchDoc)
    {
        try
        {
            if (patchDoc == null)
            {
                return BadRequest(new { Message = "The PATCH document cannot be empty." });
            }

            var examinerGetDtoResult = await _examinerService.GetExaminerByIdAsync(examinerId);

            if (!examinerGetDtoResult.Succeeded || examinerGetDtoResult.Data == null)
            {
                return NotFound(new
                    { message = examinerGetDtoResult.Message ?? examinerGetDtoResult.Errors.FirstOrDefault() });
            }

            var examinerPatchDto = _mapper.Map<ExaminerUpdateDto>(examinerGetDtoResult.Data);

            patchDoc.ApplyTo(examinerPatchDto, ModelState);

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            TryValidateModel(examinerPatchDto);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _examinerService.UpdateExaminerAsync(examinerId, examinerPatchDto);

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

            _logger?.LogError("UpdateExaminer (PATCH) failed for examiner {ExaminerId} without specific errors.",
                examinerId);
            return StatusCode(500, new { message = "An unexpected error occurred during update." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating examiner");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An unexpected error occurred during the update operation." });
        }
    }

    [HttpGet("get-examiner/{examinerId}")]
    public async Task<IActionResult> GetExaminerById(int examinerId)
    {
        var result = await _examinerService.GetExaminerByIdAsync(examinerId);

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

            _logger.LogError("Error getting examiner with id: {Id} with errors: {Errors}", examinerId,
                string.Join(", ", result.Errors));
            return StatusCode(StatusCodes.Status500InternalServerError,
                new
                {
                    message = result.Message ?? "An error occurred while retrieving examiner.", errors = result.Errors
                });
        }
    }

    [HttpDelete("delete-examiner/{examinerId}")]
    public async Task<IActionResult> DeleteExaminerById(int examinerId)
    {
        if (examinerId <= 0)
        {
            return BadRequest(new { Message = "Invalid examiner ID" });
        }

        int? deletedById = null;
        try
        {
            deletedById = GetCurrentUserIdFromToken();
        }
        catch (UnauthorizedAccessException)
        {
            _logger.LogWarning("Could not determine user ID for operator deletion tracking.");
        }

        var result = await _examinerService.DeleteExaminerAsync(examinerId, deletedById);

        if (result.Succeeded)
        {
            return Ok(new { message = result.Message });
        }

        if (result.Errors.Any())
        {
            string firstError = result.Errors.First().ToLowerInvariant();

            if (firstError.Contains("cannot be found"))
            {
                return NotFound(new { Errors = result.Errors });
            }

            if (firstError.Contains("already deleted"))
            {
                return Conflict(new { Errors = result.Errors });
            }

            if (firstError.Contains("has since been") || firstError.Contains("modified") ||
                firstError.Contains("concurrency"))
            {
                return Conflict(new { Errors = result.Errors });
            }

            return BadRequest(new { message = result.Errors });
        }

        _logger.LogError("DeleteExaminer failed for examiner ID {ExaminerId} without specific errors.", examinerId);
        return StatusCode(StatusCodes.Status500InternalServerError,
            new { message = "Unknown error happened during the deletion of operator." });
    }

    [HttpPost("restore-examiner/{examinerId}")]
    public async Task<IActionResult> RestoreOperator(int examinerId)
    {
        if (examinerId <= 0)
        {
            return BadRequest(new { Message = "Invalid examiner ID." });
        }

        var result = await _examinerService.RestoreExaminerAsync(examinerId);

        if (result.Succeeded)
        {
            return Ok(new { message = result.Message });
        }

        if (result.Errors.Any())
        {
            string firstError = result.Errors.First().ToLowerInvariant();

            if (firstError.Contains("cannot be found"))
            {
                return NotFound(new { Errors = result.Errors });
            }

            if (firstError.Contains("not currently deleted"))
            {
                return Conflict(new { Errors = result.Errors });
            }

            if (firstError.Contains("has since been") || firstError.Contains("modified") ||
                firstError.Contains("concurrency"))
            {
                return Conflict(new { Errors = result.Errors });
            }

            return BadRequest(new { message = result.Errors });
        }

        _logger.LogError("RestoreExaminer failed for examiner ID {ExaminerId} without specific errors.", examinerId);
        return StatusCode(StatusCodes.Status500InternalServerError,
            new { message = "Unknown error happened during the restoration of operator." });
    }

    private int GetCurrentUserIdFromToken()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            _logger.LogError("User ID claim (NameIdentifier) not found or invalid in token for an authorized request.");
            throw new UnauthorizedAccessException(
                "User ID (ClaimTypes.NameIdentifier) cannot be found or not int the token, despite the request is authenticated.");
        }

        return userId;
    }
}