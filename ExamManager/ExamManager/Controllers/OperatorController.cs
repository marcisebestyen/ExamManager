using System.Security.Claims;
using AutoMapper;
using ExamManager.Dtos.OperatorDtos;
using ExamManager.Interfaces;
using ExamManager.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("api/operators")]
public class OperatorController : ControllerBase
{
    private readonly IOperatorService _operatorService;
    private readonly ILogger<OperatorController> _logger;
    private readonly IMapper _mapper;

    public OperatorController(IOperatorService operatorService, ILogger<OperatorController> logger, IMapper mapper)
    {
        _operatorService = operatorService ?? throw new ArgumentNullException(nameof(operatorService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] OperatorLoginRequestDto loginRequest)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _operatorService.LoginAsync(loginRequest);

        if (result.Succeeded)
        {
            return Ok(result.Data);
        }

        switch (result.ErrorCode)
        {
            case "LOGIN_INVALID_CREDENTIALS":
                return Unauthorized(new { message = result.Errors.FirstOrDefault() });
            case "BAD_REQUEST_INVALID_FIELDS":
                return BadRequest(new { message = result.Errors.FirstOrDefault() });
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("Login failed for user: {UserName} with errors: {Errors}", loginRequest.UserName,
                    string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during login." });
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] OperatorCreateDto createRequest)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _operatorService.RegisterAsync(createRequest);

        if (result.Succeeded)
        {
            return CreatedAtAction(nameof(GetOperatorById), new { operatorId = result.Data!.Id }, result.Data);
        }

        switch (result.ErrorCode)
        {
            case "USERNAME_DUPLICATE":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "BAD_REQUEST_INVALID_FIELDS":
                return BadRequest(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError(
                    "Registration failed for user: {UserName} with errors: {Errors}",
                    createRequest.UserName,
                    string.Join(", ", result.Errors)
                );
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during registration."
                    });
        }
    }

    [Authorize]
    [HttpGet("get-profile")]
    public async Task<IActionResult> GetMyProfile()
    {
        var userId = GetCurrentUserIdFromToken();
        var result = await _operatorService.GetOperatorByIdAsync(userId);

        if (result.Succeeded)
        {
            return Ok(result.Data);
        }

        switch (result.ErrorCode)
        {
            case "OPERATOR_NOT_FOUND":
                _logger?.LogInformation("User profile not found for user ID: {RequestedUserId}", userId);
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("Error getting user profile for ID: {UserId} with errors: {Errors}", userId,
                    string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ?? "An error occurred while retrieving your profile."
                    });
        }
    }

    [HttpPatch("update-profile/{operatorId}")]
    public async Task<IActionResult> UpdateOperator(int operatorId,
        [FromBody] JsonPatchDocument<OperatorUpdateDto> patchDoc)
    {
        if (patchDoc == null)
        {
            return BadRequest(new { message = "The PATCH document cannot be empty." });
        }

        var operatorGetDtoResult = await _operatorService.GetOperatorByIdAsync(operatorId);
        if (!operatorGetDtoResult.Succeeded || operatorGetDtoResult.Data == null)
        {
            return NotFound(new { message = operatorGetDtoResult.Errors.FirstOrDefault() });
        }

        var operatorPatchDto = _mapper.Map<OperatorUpdateDto>(operatorGetDtoResult.Data);
        patchDoc.ApplyTo(operatorPatchDto, ModelState);

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _operatorService.UpdateOperatorAsync(operatorId, operatorPatchDto);
        if (result.Succeeded)
        {
            if (result.Message == "No changes detected for update.")
            {
                return Ok(new { message = result.Message });
            }

            return NoContent();
        }

        switch (result.ErrorCode)
        {
            case "OPERATOR_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "CONCURRENCY_ERROR":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("UpdateOperator (PATCH) failed for ID {OperatorId} with errors: {Errors}",
                    operatorId, string.Join(", ", result.Errors));
                return StatusCode(500,
                    new { message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during update." });
        }
    }

    [HttpGet("get-operator/{operatorId}")]
    public async Task<IActionResult> GetOperatorById(int operatorId)
    {
        var result = await _operatorService.GetOperatorByIdAsync(operatorId);

        if (result.Succeeded)
        {
            return Ok(result.Data);
        }

        switch (result.ErrorCode)
        {
            case "OPERATOR_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("Error getting operator with id: {Id} with errors: {Errors}", operatorId,
                    string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ??
                                  "An unexpected error occurred while retrieving operator."
                    });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("delete-operator/{operatorId}")]
    public async Task<IActionResult> DeleteOperator(int operatorId)
    {
        if (operatorId <= 0)
        {
            return BadRequest(new { message = "Invalid operator ID." });
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

        var result = await _operatorService.DeleteOperatorAsync(operatorId, deletedById);

        if (result.Succeeded)
        {
            return Ok(new { message = result.Message });
        }

        switch (result.ErrorCode)
        {
            case "OPERATOR_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "OPERATOR_ALREADY_DELETED":
            case "CONCURRENCY_ERROR":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("DeleteOperator failed for ID {OperatorId} with errors: {Errors}", operatorId,
                    string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ??
                                  "Unknown error happened during the deletion of operator."
                    });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("restore-operator/{operatorId}")]
    public async Task<IActionResult> RestoreOperator(int operatorId)
    {
        if (operatorId <= 0)
        {
            return BadRequest(new { message = "Invalid operator ID." });
        }

        var result = await _operatorService.RestoreOperatorAsync(operatorId);

        if (result.Succeeded)
        {
            return Ok(new { message = result.Message });
        }

        switch (result.ErrorCode)
        {
            case "OPERATOR_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "OPERATOR_NOT_DELETED":
            case "CONCURRENCY_ERROR":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("RestoreOperator failed for ID {OperatorId} with errors: {Errors}", operatorId,
                    string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ??
                                  "Unknown error happened during the restoration of operator."
                    });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("assign-role/{targetOperatorId}")]
    public async Task<IActionResult> AssignRole(int targetOperatorId, [FromQuery] Role newRole)
    {
        if (targetOperatorId <= 0)
        {
            return BadRequest(new { message = "Invalid target operator ID." });
        }

        int assignedById;
        try
        {
            assignedById = GetCurrentUserIdFromToken();
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogError(ex,
                "Attempt to assign role by unauthenticated user, despite [Authorize] attribute. This should not happen.");
            return Unauthorized(new
                { message = "Authentication error: Could not determine performing admin's identity." });
        }

        var result = await _operatorService.AssignRoleAsync(targetOperatorId, newRole, assignedById);

        if (result.Succeeded)
        {
            return Ok(new { message = result.Message });
        }

        switch (result.ErrorCode)
        {
            case "OPERATOR_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "BAD_REQUEST_INVALID_FIELDS":
            case "SELF_DEMOTION_FORBIDDEN":
            case "SELF_PROMOTION_FORBIDDEN":
                return BadRequest(new { message = result.Errors.FirstOrDefault() });
            case "UNAUTHORIZED_ROLE_ASSIGNMENT":
                return Forbid();
            case "CONCURRENCY_ERROR":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError(
                    "AssignRole failed for target operator ID {TargetOperatorId} by admin {AssignedById} to role {NewRole} with errors: {Errors}",
                    targetOperatorId, assignedById, newRole, string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ??
                                  "An unexpected error occurred during role assignment."
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
                "User ID (ClaimTypes.NameIdentifier) cannot be found or not int the token, despite the request is authenticated.");
        }

        return userId;
    }
}