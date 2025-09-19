using AutoMapper;
using ExamManager.Dtos.ProfessionDtos;
using ExamManager.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("api/professions")]
[Authorize]
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

        switch (result.ErrorCode)
        {
            case "KEOR_ID_DUPLICATE":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "BAD_REQUEST_INVALID_FIELDS":
                return BadRequest(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError(
                    "Creation failed for profession: {ProfessionId} with errors: {Errors}",
                    createRequest.KeorId,
                    string.Join(", ", result.Errors)
                );
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during creation."
                    });
        }
    }

    [HttpPatch("update-profession/{professionId}")]
    public async Task<IActionResult> UpdateProfession(int professionId,
        [FromBody] JsonPatchDocument<ProfessionUpdateDto> patchDoc)
    {
        if (patchDoc == null)
        {
            return BadRequest(new { message = "The PATCH document cannot be empty." });
        }

        var professionGetDtoResult = await _professionService.GetProfessionByIdAsync(professionId);

        if (!professionGetDtoResult.Succeeded || professionGetDtoResult.Data == null)
        {
            return NotFound(new { message = professionGetDtoResult.Errors.FirstOrDefault() });
        }

        var professionPatchDto = _mapper.Map<ProfessionUpdateDto>(professionGetDtoResult.Data);
        patchDoc.ApplyTo(professionPatchDto);

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _professionService.UpdateProfessionAsync(professionId, professionPatchDto);

        if (result.Succeeded)
        {
            if (result.Message == "No changes detected to update.")
            {
                return Ok(new { message = result.Message });
            }

            return NoContent();
        }

        switch (result.ErrorCode)
        {
            case "PROFESSION_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "KEOR_ID_DUPLICATE":
            case "CONCURRENCY_ERROR":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "BAD_REQUEST_INVALID_FIELDS":
                return BadRequest(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("UpdateProfession (PATCH) failed for ID {ProfessionId} with errors: {Errors}",
                    professionId, string.Join(", ", result.Errors));
                return StatusCode(500,
                    new { message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during update." });
        }
    }

    [HttpGet("get-profession/{professionId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProfessionById(int professionId)
    {
        var result = await _professionService.GetProfessionByIdAsync(professionId);

        if (result.Succeeded)
        {
            return Ok(result.Data);
        }

        switch (result.ErrorCode)
        {
            case "PROFESSION_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("Error getting profession with id: {Id} with errors: {Errors}", professionId,
                    string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ??
                                  "An unexpected error occurred while retrieving profession."
                    });
        }
    }

    [HttpGet("get-all-professions")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAllProfessions()
    {
        var result = await _professionService.GetAllProfessionsAsync();

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
                    _logger.LogError("Error getting all professions with errors: {Errors}",
                        string.Join(", ", result.Errors));
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new
                        {
                            message = result.Errors.FirstOrDefault() ??
                                      "An unexpected error occurred while retrieving professions."
                        });
            }
        }
    }

    [HttpDelete("delete-profession/{professionId}")]
    public async Task<IActionResult> DeleteProfession(int professionId)
    {
        if (professionId <= 0)
        {
            return BadRequest(new { message = "Invalid profession ID." });
        }

        var result = await _professionService.DeleteProfessionAsync(professionId);

        if (result.Succeeded)
        {
            return Ok(new { message = result.Message });
        }

        switch (result.ErrorCode)
        {
            case "PROFESSION_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "CONCURRENCY_ERROR":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("DeleteProfession failed for ID {ProfessionId} with errors: {Errors}", professionId,
                    string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ??
                                  "An unknown error occurred during the deletion of the profession."
                    });
        }
    }
}