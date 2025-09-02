using AutoMapper;
using ExamManager.Dtos.InstitutionDtos;
using ExamManager.Interfaces;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("api/institutions")]
public class InstitutionController : ControllerBase
{
    private readonly IInstitutionService _institutionService;
    private readonly ILogger<InstitutionController> _logger;
    private readonly IMapper _mapper;

    public InstitutionController(IInstitutionService institutionService, ILogger<InstitutionController> logger,
        IMapper mapper)
    {
        _institutionService = institutionService ?? throw new ArgumentNullException(nameof(institutionService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
    }

    [HttpPost("create-new-institution")]
    public async Task<IActionResult> CreateNewInstitution([FromBody] InstitutionCreateDto createRequest)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _institutionService.CreateInstitutionAsync(createRequest);

        if (result.Succeeded)
        {
            return CreatedAtAction(nameof(GetInstitutionById), new { institutionId = result.Data!.Id }, result.Data);
        }
        else
        {
            switch (result.ErrorCode)
            {
                case "INSTITUTION_ID_DUPLICATE":
                    return Conflict(new { message = result.Errors.FirstOrDefault() });
                case "BAD_REQUEST_INVALID_FIELDS":
                    return BadRequest(new { message = result.Errors.FirstOrDefault() });
                case "DB_UPDATE_ERROR":
                case "UNEXPECTED_ERROR":
                default:
                    _logger.LogError(
                        "Creation failed for institution: {InstitutionID} with errors: {Errors}",
                        createRequest.EducationalId,
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

    [HttpPatch("update-institution/{institutionId}")]
    public async Task<IActionResult> UpdateInstitution(int institutionId,
        [FromBody] JsonPatchDocument<InstitutionUpdateDto> patchDoc)
    {
        if (patchDoc == null)
        {
            return BadRequest(new { message = "The PATCH document cannot be empty." });
        }

        var institutionGetDtoResult = await _institutionService.GetInstitutionByIdAsync(institutionId);

        if (!institutionGetDtoResult.Succeeded || institutionGetDtoResult.Data == null)
        {
            return NotFound(new { message = institutionGetDtoResult.Errors.FirstOrDefault() });
        }

        var institutionPatchDto = _mapper.Map<InstitutionUpdateDto>(institutionGetDtoResult.Data);

        patchDoc.ApplyTo(institutionPatchDto);

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        TryValidateModel(institutionPatchDto);
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _institutionService.UpdateInstitutionAsync(institutionId, institutionPatchDto);

        if (result.Succeeded)
        {
            return NoContent();
        }

        switch (result.ErrorCode)
        {
            case "INSTITUTION_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "INSTITUTION_ID_DUPLICATE":
            case "CONCURRENCY_ERROR":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError(
                    "UpdateInstitution (PATCH) failed for institution {InstitutionId} with errors: {Errors}",
                    institutionId, string.Join(", ", result.Errors));
                return StatusCode(500,
                    new { message = result.Errors.FirstOrDefault() ?? "An unexpected error occurred during update." });
        }
    }

    [HttpGet("get-institution/{institutionId}")]
    public async Task<IActionResult> GetInstitutionById(int institutionId)
    {
        var result = await _institutionService.GetInstitutionByIdAsync(institutionId);

        if (result.Succeeded)
        {
            return Ok(result.Data);
        }
        else
        {
            switch (result.ErrorCode)
            {
                case "INSTITUTION_NOT_FOUND":
                    return NotFound(new { message = result.Errors.FirstOrDefault() });
                case "UNEXPECTED_ERROR":
                default:
                    _logger.LogError("Error getting institution with id: {Id} with errors: {Errors}", institutionId,
                        string.Join(", ", result.Errors));
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new
                        {
                            message = result.Errors.FirstOrDefault() ??
                                      "An unexpected error occurred while retrieving institution."
                        });
            }
        }
    }

    [HttpDelete("delete-institution/{institutionId}")]
    public async Task<IActionResult> DeleteInstitution(int institutionId)
    {
        if (institutionId <= 0)
        {
            return BadRequest(new { Message = "Invalid institution ID." });
        }

        var result = await _institutionService.DeleteInstitutionAsync(institutionId);

        if (result.Succeeded)
        {
            return Ok(new { message = result.Message });
        }

        switch (result.ErrorCode)
        {
            case "INSTITUTION_NOT_FOUND":
                return NotFound(new { message = result.Errors.FirstOrDefault() });
            case "CONCURRENCY_ERROR":
                return Conflict(new { message = result.Errors.FirstOrDefault() });
            case "DB_UPDATE_ERROR":
            case "UNEXPECTED_ERROR":
            default:
                _logger.LogError("DeleteInstitution failed for ID {InstitutionId} with errors: {Errors}", institutionId,
                    string.Join(", ", result.Errors));
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = result.Errors.FirstOrDefault() ??
                                  "An unknown error happened during the deletion of the institution."
                    });
        }
    }
}