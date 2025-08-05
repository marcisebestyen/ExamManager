using AutoMapper;
using ExamManager.Dtos.InstitutionDtos;
using ExamManager.Interfaces;
using ExamManager.Models;
using ExamManager.Repositories;
using ExamManager.Responses;
using ExamManager.Responses.InstitutionResponses;
using Microsoft.EntityFrameworkCore;

namespace ExamManager.Services;

public class InstitutionService : IInstitutionService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<InstitutionService> _logger;
    private readonly IConfiguration _configuration;

    public InstitutionService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<InstitutionService> logger,
        IConfiguration configuration)
    {
        _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    }

    public async Task<BaseServiceResponse<InstitutionCreateResponseDto>> CreateInstitutionAsync(
        InstitutionCreateDto createRequest)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(createRequest.Name) ||
                string.IsNullOrWhiteSpace(createRequest.EducationalId) ||
                createRequest.ZipCode < 0 ||
                string.IsNullOrWhiteSpace(createRequest.ZipCode.ToString()) ||
                string.IsNullOrWhiteSpace(createRequest.Town) ||
                string.IsNullOrWhiteSpace(createRequest.Number))
            {
                return BaseServiceResponse<InstitutionCreateResponseDto>.Failed(
                    "Compulsory fields are required for creating.");
            }

            if (await InstitutionExists(createRequest.EducationalId))
            {
                throw new InvalidOperationException(
                    $"Educational ID '{createRequest.EducationalId}' is already taken.");
            }

            var institutionEntity = _mapper.Map<Institution>(createRequest);

            await _unitOfWork.InstitutionRepository.InsertAsync(institutionEntity);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("New institution registered: {EduId}", createRequest.EducationalId);

            var createResponseDto = _mapper.Map<InstitutionCreateResponseDto>(institutionEntity);
            return BaseServiceResponse<InstitutionCreateResponseDto>.Success(createResponseDto, "Create successful.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during creation for institution: {ID}", createRequest.EducationalId);
            return BaseServiceResponse<InstitutionCreateResponseDto>.Failed(
                "An unexpected error occurred during creation.");
        }
    }

    public async Task<BaseServiceResponse<InstitutionResponseDto>> GetInstitutionByIdAsync(int institutionId)
    {
        try
        {
            var institutionEntity =
                await _unitOfWork.InstitutionRepository.GetByIdAsync(new object[] { institutionId });

            if (institutionEntity == null)
            {
                return BaseServiceResponse<InstitutionResponseDto>.Failed();
            }

            var institutionResponseDto = _mapper.Map<InstitutionResponseDto>(institutionEntity);
            return BaseServiceResponse<InstitutionResponseDto>.Success(institutionResponseDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting institution with {id}", institutionId);
            return BaseServiceResponse<InstitutionResponseDto>.Failed(
                $"An error occured while retrieving examiner with ID {institutionId}");
        }
    }

    public async Task<BaseServiceResponse<bool>> UpdateInstitutionAsync(int institutionId,
        InstitutionUpdateDto updateRequest)
    {
        try
        {
            var institutionEntity =
                await _unitOfWork.InstitutionRepository.GetByIdAsync(new object[] { institutionId });

            if (institutionEntity == null)
            {
                return BaseServiceResponse<bool>.Failed("Institution to be modified cannot be found.");
            }

            bool changed = false;

            if (updateRequest.Name != null && updateRequest.Name != institutionEntity.Name)
            {
                changed = true;
                institutionEntity.Name = updateRequest.Name;
            }

            if (updateRequest.EducationalId != null && updateRequest.EducationalId != institutionEntity.EducationalId)
            {
                changed = true;
                institutionEntity.EducationalId = updateRequest.EducationalId;
            }

            if (updateRequest.ZipCode.HasValue && updateRequest.ZipCode != institutionEntity.ZipCode)
            {
                changed = true;
                institutionEntity.ZipCode = updateRequest.ZipCode.Value;
            }

            if (updateRequest.Town != null && updateRequest.Town != institutionEntity.Town)
            {
                changed = true;
                institutionEntity.Town = updateRequest.Town;
            }

            if (updateRequest.Street != null && updateRequest.Street != institutionEntity.Street)
            {
                changed = true;
                institutionEntity.Street = updateRequest.Street;
            }

            if (updateRequest.Number != null && updateRequest.Number != institutionEntity.Number)
            {
                changed = true;
                institutionEntity.Number = updateRequest.Number;
            }

            if (updateRequest.Floor != null && updateRequest.Floor != institutionEntity.Floor)
            {
                changed = true;
                institutionEntity.Floor = updateRequest.Floor;
            }

            if (updateRequest.Door != null && updateRequest.Door != institutionEntity.Door)
            {
                changed = true;
                institutionEntity.Door = updateRequest.Door;
            }

            if (!changed)
            {
                return BaseServiceResponse<bool>.Success(true, "No changes detected to update.");
            }

            try
            {
                await _unitOfWork.InstitutionRepository.UpdateASync(institutionEntity);
                await _unitOfWork.SaveAsync();
                return BaseServiceResponse<bool>.Success(true, "Institution updated successfully.");
            }
            catch (DbUpdateConcurrencyException ex)
            {
                return BaseServiceResponse<bool>.Failed("Someone has changed the data. Try again please.");
            }
            catch (DbUpdateException ex)
            {
                return BaseServiceResponse<bool>.Failed(
                    $"Database error during update: {ex.InnerException?.Message ?? ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during institution's data update.");
                return BaseServiceResponse<bool>.Failed($"Unexpected error: {ex.Message}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating institution with id: {institutionId}", institutionId);
            return BaseServiceResponse<bool>.Failed(
                $"An unexpected error occurred while updating institution with ID {institutionId}.");
        }
    }

    public async Task<BaseServiceResponse<string>> DeleteInstitutionAsync(int institutionId)
    {
        try
        {
            await _unitOfWork.InstitutionRepository.DeleteAsync(institutionId);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation($"Deleted institution with ID {institutionId}");
            return BaseServiceResponse<string>.Success($"Institution with ID: {institutionId} deleted successfully.");
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Attempted to delete non-existing institution with ID: {InstitutionId}",
                institutionId);
            return BaseServiceResponse<string>.Failed($"Institution with ID {institutionId} cannot be found.");
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex,
                "Concurrency conflicts when deleting institution with ID {InstitutionId}. Try again please.",
                institutionId);
            return BaseServiceResponse<string>.Failed(
                $"The institution has since been modified by someone else. Try again please.");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error occurred while deleting institution with ID {InstitutionId}.", institutionId);
            return BaseServiceResponse<string>.Failed(
                $"Database error during deleting: {ex.InnerException?.Message ?? ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while deleting institution with ID {InstitutionId}.", institutionId);
            return BaseServiceResponse<string>.Failed($"Unexpected error: {ex.Message}");
        }
    }

    private async Task<bool> InstitutionExists(string educationalId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(educationalId))
            {
                return false;
            }

            var institutions = await _unitOfWork.InstitutionRepository.GetAsync(i => i.EducationalId == educationalId);

            return institutions.Any();
        }
        catch (Exception ex)
        {
            _logger.LogError("Error checking if institution exists: {EduId}", educationalId);
            throw;
        }
    }
}