using AutoMapper;
using ExamManager.Dtos.ProfessionDtos;
using ExamManager.Interfaces;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("professions")]
public class ProfessionController : ControllerBase
{
    private readonly IProfessionService _professionService;
    private readonly IMapper _mapper;
    private readonly ILogger<ProfessionController> _logger;

    public ProfessionController(IProfessionService professionService, IMapper mapper,
        ILogger<ProfessionController> logger)
    {
        _professionService = professionService ?? throw new ArgumentNullException(nameof(professionService));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpPost("create-new-profession")]
    public async Task<IActionResult> CreateNewProfession([FromBody] ProfessionCreateDto createRequest)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _professionService.CreateProfessionAsync(createRequest);

        if (result.Succeeded)
        {
            return CreatedAtAction(nameof(GetProfessionById), new { professionId = result.Data!.Id }, result.Data);
        }
        else
        {
            string firstError = result.Errors.FirstOrDefault()?.ToLowerInvariant() ?? "";

            if (firstError.Contains("keor id") && firstError.Contains("already taken"))
            {
                return Conflict(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            if (firstError.Contains("all fields are required"))
            {
                return BadRequest(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            _logger.LogError(
                "Creation failed for profession: {ProfessionId} with errors: {Errors}",
                createRequest.KeorId,
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

    [HttpPost("update-profession/{professionId}")]
    public async Task<IActionResult> UpdateProfession(int professionId,
        [FromBody] JsonPatchDocument<ProfessionUpdateDto> patchDoc)
    {
        try
        {
            if (patchDoc == null)
            {
                return BadRequest(new { Message = "The PATCH document cannot be empty." });
            }

            var professionGetDtoResult = await _professionService.GetProfessionByIdAsync(professionId);

            if (!professionGetDtoResult.Succeeded || professionGetDtoResult.Data == null)
            {
                return NotFound(new
                    { message = professionGetDtoResult.Message ?? professionGetDtoResult.Errors.FirstOrDefault() });
            }

            var professionPatchDto = _mapper.Map<ProfessionUpdateDto>(professionGetDtoResult.Data);

            patchDoc.ApplyTo(professionPatchDto);

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            TryValidateModel(professionPatchDto);
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _professionService.UpdateProfessionAsync(professionId, professionPatchDto);

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
            
            _logger?.LogError("UpdateProfession (PATCH) failed for profession {ProfessionId} without specific errors.",
                professionId);
            return StatusCode(500, new { message = "An unexpected error occurred during update." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating profession");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An unexpected error occurred during the update operation." });
        }
    }

    [HttpGet("get-profession/{professionId}")]
    public async Task<IActionResult> GetProfessionById(int professionId)
    {
        var result = await _professionService.GetProfessionByIdAsync(professionId);

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

            _logger.LogError("Error getting profession with id: {Id} with errors: {Errors}", professionId,
                string.Join(", ", result.Errors));
            return StatusCode(StatusCodes.Status500InternalServerError,
                new
                {
                    message = result.Message ?? "An error occured while retrieving profession.", errors = result.Errors
                });
        }
    }
    
    [HttpDelete("delete-profession/{professionId}")]
    public async Task<IActionResult> DeleteInstitution(int professionId)
    {
        if (professionId <= 0)
        {
            return BadRequest(new { Message = "Invalid profession ID." });
        }

        var result = await _professionService.DeleteProfessionAsync(professionId);

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

        _logger.LogError("DeleteProfession failed for ID {ProfessionId} without specific errors.", professionId);
        return StatusCode(StatusCodes.Status500InternalServerError,
            new { message = "An unknown error happened during the deletion of the profession." });
    }
}