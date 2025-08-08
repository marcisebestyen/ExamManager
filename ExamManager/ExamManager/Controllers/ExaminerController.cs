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
            switch (result.ErrorCode)
            {
                case "IDENTITY_CARD_DUPLICATE":
                    return Conflict(new { message = result.Errors.FirstOrDefault() });
                case "BAD_REQUEST_INVALID_FIELDS":
                    return BadRequest(new { message = result.Errors.FirstOrDefault() });
                case "DB_UPDATE_ERROR":
                case "UNEXPECTED_ERROR":
                default:
                    _logger.LogError(
                        "Creation failed for examiner: {IDCardNumber} with errors: {Errors}",
                        createRequest.IdentityCardNumber,
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

    [HttpPatch("update-examiner/{examinerId}")]
    public async Task<IActionResult> UpdateExaminer(int examinerId,
        [FromBody] JsonPatchDocument<ExaminerUpdateDto> patchDoc)
    {
        if (patchDoc == null)
        {
            return BadRequest(new { message = "The PATCH document cannot be empty." });
        }

        var examinerGetDtoResult = await _examinerService.GetExaminerByIdAsync(examinerId);

        if (!examinerGetDtoResult.Succeeded || examinerGetDtoResult.Data == null)
        {
            return NotFound(new { message = examinerGetDtoResult.Errors.FirstOrDefault() });
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

        switch (result.ErrorCode)
        {
            case "EXAMINER_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "IDENTITY_CARD_DUPLICATE":
            case "CONCURRENCY_ERROR":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger?.LogError("UpdateExaminer (PATCH) failed for examiner {ExaminerId} with errors: {Errors}",
                    examinerId, string.Join(", ", result.Errors));
                return StatusCode(500,
                    new { message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during update." });
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
            switch (result.ErrorCode)
            {
                case "EXAMINER_NOT_FOUND":
                    return NotFound(new { message = result.Errors.FirstOrDefault() });
                case "UNEXPECTED_ERROR":
                default:
                    _logger.LogError("Error getting examiner with id: {Id} with errors: {Errors}", examinerId,
                        string.Join(", ", result.Errors));
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new
                        {
                            message = result.Errors.FirstOrDefault() ??
                                      "An unexpected error occurred while retrieving examiner."
                        });
            }
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

        switch (result.ErrorCode)
        {
            case "EXAMINER_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "EXAMINER_ALREADY_DELETED":
            case "CONCURRENCY_ERROR":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("DeleteExaminer failed for examiner ID {ExaminerId} with errors: {Errors}",
                    examinerId, string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ??
                                  "Unknown error happened during the deletion of the examiner."
                    });
        }
    }

    [HttpPost("restore-examiner/{examinerId}")]
    public async Task<IActionResult> RestoreExaminer(int examinerId)
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

        switch (result.ErrorCode)
        {
            case "EXAMINER_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "EXAMINER_ALREADY_RESTORED":
            case "CONCURRENCY_ERROR":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("RestoreExaminer failed for examiner ID {ExaminerId} with errors: {Errors}",
                    examinerId, string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ??
                                  "Unknown error happened during the restoration of the examiner."
                    });
        }
    }

    private int GetCurrentUserIdFromToken()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            _logger.LogError("User ID claim (NameIdentifier) not found or invalid in token for an authorized request.");
            throw new UnauthorizedAccessException(
                "User ID (ClaimTypes.NameIdentifier) cannot be found or not in the token, despite the request is authenticated.");
        }

        return userId;
    }
}