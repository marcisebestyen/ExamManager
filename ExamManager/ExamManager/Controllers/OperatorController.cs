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
[Route("operators")]
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
        else
        {
            string firstError = result.Errors.FirstOrDefault()?.ToLowerInvariant() ?? "";

            if (firstError.Contains("invalid username or password"))
            {
                return Unauthorized(new
                {
                    message = result.Message ?? result.Errors.FirstOrDefault()
                });
            }

            _logger.LogError("Login failed for user: {UserName} with errors: {Errors}", loginRequest.UserName,
                string.Join(", ", result.Errors));
            return StatusCode(StatusCodes.Status500InternalServerError,
                new
                {
                    message = result.Message ?? "An unexpected error occurred during login.", errors = result.Errors
                });
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
            return CreatedAtAction(nameof(GetOperatorById), new { operatorId = result.Data!.Id },
                result.Data);
        }
        else
        {
            string firstError = result.Errors.FirstOrDefault()?.ToLowerInvariant() ?? "";

            if (firstError.Contains("username") && firstError.Contains("already taken"))
            {
                return Conflict(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            if (firstError.Contains("all fields are required"))
            {
                return BadRequest(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            _logger.LogError(
                "Registration failed for user: {UserName} with errors: {Errors}",
                createRequest.UserName,
                string.Join(", ", result.Errors)
            );
            return StatusCode(StatusCodes.Status500InternalServerError,
                new
                {
                    message = result.Message ?? "An unexpected error occurred during registration",
                    errors = result.Errors
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
        else
        {
            string firstError = result.Errors.FirstOrDefault()?.ToLowerInvariant() ?? "";
            if (firstError.Contains("cannot be found"))
            {
                _logger?.LogInformation("User profile not found for user ID: {RequestedUserId}", userId);
                return NotFound(new { Message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            _logger.LogError("Error getting user profile for ID: {UserId} with errors: {Errors}", userId,
                string.Join(", ", result.Errors));
            return StatusCode(StatusCodes.Status500InternalServerError,
                new
                {
                    message = result.Message ?? "An error occurred while retrieving your profile.",
                    errors = result.Errors
                });
        }
    }

    [HttpPatch("update-profile/{operatorId}")]
    public async Task<IActionResult> UpdateOperator(int operatorId,
        [FromBody] JsonPatchDocument<OperatorUpdateDto> patchDoc)
    {
        try
        {
            if (patchDoc == null)
            {
                return BadRequest(new { Message = "The PATCH document cannot be empty." });
            }

            var operatorGetDtoResult = await _operatorService.GetOperatorByIdAsync(operatorId);

            if (!operatorGetDtoResult.Succeeded || operatorGetDtoResult.Data == null)
            {
                return NotFound(new
                    { Message = operatorGetDtoResult.Message ?? operatorGetDtoResult.Errors.FirstOrDefault() });
            }

            var operatorPatchDto = _mapper.Map<OperatorUpdateDto>(operatorGetDtoResult.Data);

            patchDoc.ApplyTo(operatorPatchDto, ModelState);

            if (!ModelState.IsValid)
            {   
                return BadRequest(ModelState);
            }

            TryValidateModel(operatorPatchDto);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _operatorService.UpdateOperatorAsync(operatorId, operatorPatchDto);

            if (result.Succeeded)
            {
                return NoContent();
            }

            if (result.Errors.Any())
            {
                string firstError = result.Errors.First().ToLowerInvariant();

                if (firstError.Contains("cannot be found"))
                {
                    return NotFound(new { Errors = result.Errors });
                }

                if (firstError.Contains("changed the data") || firstError.Contains("concurrency"))
                {
                    return Conflict(new { Errors = result.Errors });
                }

                return BadRequest(new { Error = result.Errors });
            }

            _logger?.LogError("UpdateOperator (PATCH) failed for operator ID {OperatorId} without specific errors.",
                operatorId);
            return StatusCode(500, new { message = "An unexpected error occurred during update." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating operator");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An unexpected error occurred during the update operation." });
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
        else
        {
            string firstError = result.Errors.FirstOrDefault()?.ToLowerInvariant() ?? "";
            if (firstError.Contains("cannot be found"))
            {
                return NotFound(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            _logger.LogError("Error getting operator with id: {Id} with errors: {Errors}", operatorId,
                string.Join(", ", result.Errors));
            return StatusCode(StatusCodes.Status500InternalServerError,
                new
                {
                    message = result.Message ?? "An error occurred while retrieving operator.", errors = result.Errors
                });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("delete-operator/{operatorId}")]
    public async Task<IActionResult> DeleteOperator(int operatorId)
    {
        if (operatorId <= 0)
        {
            return BadRequest(new { Message = "Invalid operator ID." });
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

        _logger.LogError("DeleteOperator failed for operator ID {OperatorId} without specific errors.", operatorId);
        return StatusCode(StatusCodes.Status500InternalServerError,
            new { message = "Unknown error happened during the deletion of operator." });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("restore-operator/{operatorId}")]
    public async Task<IActionResult> RestoreOperator(int operatorId)
    {
        if (operatorId <= 0)
        {
            return BadRequest(new { Message = "Invalid operator ID." });
        }

        var result = await _operatorService.RestoreOperatorAsync(operatorId);

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

        _logger.LogError("RestoreOperator failed for operator ID {OperatorId} without specific errors.", operatorId);
        return StatusCode(StatusCodes.Status500InternalServerError,
            new { message = "Unknown error happened during the restoration of operator." });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("assign-role/{targetOperatorId}")]
    public async Task<IActionResult> AssignRole(int targetOperatorId, [FromQuery] Role newRole)
    {
        if (targetOperatorId <= 0)
        {
            return BadRequest(new { Message = "Invalid target operator ID." });
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
                { Message = "Authentication error: Could not determine performing admin's identity." });
        }

        var result = await _operatorService.AssignRoleAsync(targetOperatorId, newRole, assignedById);

        if (result.Succeeded)
        {
            return Ok(new { message = result.Message });
        }
        else
        {
            string firstError = result.Errors.FirstOrDefault()?.ToLowerInvariant() ?? "";

            if (firstError.Contains("not found"))
            {
                return NotFound(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            if (firstError.Contains("only administrators"))
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            if (firstError.Contains("already has the role") || firstError.Contains("concurrency conflict"))
            {
                return Conflict(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            if (firstError.Contains("cannot demote themselves") || firstError.Contains("invalid target operator id"))
            {
                return BadRequest(new
                    { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            _logger.LogError(
                "AssignRole failed for target operator ID {TargetOperatorId} by admin {AssignedById} to role {NewRole} with errors: {Errors}",
                targetOperatorId, assignedById, newRole, string.Join(", ", result.Errors));
            return StatusCode(StatusCodes.Status500InternalServerError,
                new
                {
                    message = result.Message ?? "An unexpected error occurred during role assignment.",
                    errors = result.Errors
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