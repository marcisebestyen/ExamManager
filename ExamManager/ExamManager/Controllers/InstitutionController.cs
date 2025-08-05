using AutoMapper;
using ExamManager.Dtos.InstitutionDtos;
using ExamManager.Interfaces;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;

namespace ExamManager.Controllers;

[ApiController]
[Route("institutions")]
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
            string firstError = result.Errors.FirstOrDefault()?.ToLowerInvariant() ?? "";

            if (firstError.Contains("educational id") && firstError.Contains("already taken"))
            {
                return Conflict(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            if (firstError.Contains("compulsory fields are required"))
            {
                return BadRequest(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            _logger.LogError(
                "Creation failed for institution: {InstitutionID} with errors: {Errors}",
                createRequest.EducationalId,
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

    [HttpPatch("update-institution/{institutionId}")]
    public async Task<IActionResult> UpdateInstitution(int institutionId,
        [FromBody] JsonPatchDocument<InstitutionUpdateDto> patchDoc)
    {
        try
        {
            if (patchDoc == null)
            {
                return BadRequest(new { Message = "The PATCH document cannot be empty." });
            }

            var institutionGetDtoResult = await _institutionService.GetInstitutionByIdAsync(institutionId);

            if (!institutionGetDtoResult.Succeeded || institutionGetDtoResult.Data == null)
            {
                return NotFound(new
                    { message = institutionGetDtoResult.Message ?? institutionGetDtoResult.Errors.FirstOrDefault() });
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
            
            _logger?.LogError("UpdateInstitution (PATCH) failed for examiner {InstitutionId} without specific errors.",
                institutionId);
            return StatusCode(500, new { message = "An unexpected error occurred during update." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating institution");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "An unexpected error occurred during the update operation." });
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
            string firstError = result.Errors.FirstOrDefault()?.ToLowerInvariant() ?? "";
            if (firstError.Contains("cannot be found"))
            {
                return NotFound(new { message = result.Message ?? result.Errors.FirstOrDefault() });
            }

            _logger.LogError("Error getting institution with id: {Id} with errors: {Errors}", institutionId,
                string.Join(", ", result.Errors));
            return StatusCode(StatusCodes.Status500InternalServerError,
                new
                {
                    message = result.Message ?? "An error occured while retrieving institution.", errors = result.Errors
                });
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

        _logger.LogError("DeleteInstitution failed for ID {InstitutionId} without specific errors.", institutionId);
        return StatusCode(StatusCodes.Status500InternalServerError,
            new { message = "An unknown error happened during the deletion of the institution." });
    }
}