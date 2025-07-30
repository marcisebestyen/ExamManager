using ExamManager.Dtos.OperatorDtos;
using ExamManager.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("operators")]
public class OperatorController : ControllerBase
{
    private readonly IOperatorService _operatorService;
    private readonly ILogger<OperatorController> _logger;

    public OperatorController(IOperatorService operatorService, ILogger<OperatorController> logger)
    {
        _operatorService = operatorService ?? throw new ArgumentNullException(nameof(operatorService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] OperatorLoginRequestDto loginRequest)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _operatorService.LoginAsync(loginRequest);

            if (result == null)
            {
                return Unauthorized(new { message = "Invalid username or password" });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login");
            return StatusCode(500, new { message = "An error occured during login." });
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] OperatorCreateDto createRequest)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _operatorService.RegisterAsync(createRequest);
            return CreatedAtAction(nameof(GetOperator), new { operatorId = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during registration");
            return StatusCode(500, new { message = "An error occurred during registration" });
        }
    }
    
    [HttpGet("get-operator/{operatorId}")]
    public async Task<IActionResult> GetOperator(int operatorId)
    {
        try
        {
            var result = await _operatorService.GetOperatorByIdAsync(operatorId);

            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting operator with id: {Id}", operatorId);
            throw;
        }
    }

    [HttpGet("check-username/{username}")]
    public async Task<IActionResult> CheckUsername(string username)
    {
        try
        {
            var exists = await _operatorService.UserExistsAsync(username);

            return Ok(new { exists });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking username: {Username}", username);
            return StatusCode(500, new { message = "An error occurred while checking username" });
        }
    }
}