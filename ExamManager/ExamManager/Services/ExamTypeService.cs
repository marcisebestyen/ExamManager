using AutoMapper;
using ExamManager.Dtos;
using ExamManager.Interfaces;
using ExamManager.Models;
using ExamManager.Repositories;
using ExamManager.Responses;
using ExamManager.Responses.ExamTypeResponses;
using Microsoft.EntityFrameworkCore;

namespace ExamManager.Services;

public class ExamTypeService : IExamTypeService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<ExamTypeService> _logger;

    public ExamTypeService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<ExamTypeService> logger)
    {
        _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<BaseServiceResponse<ExamTypeCreateResponseDto>> CreateExamTypeAsync(
        ExamTypeCreateDto createRequest)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(createRequest.TypeName))
            {
                return BaseServiceResponse<ExamTypeCreateResponseDto>.Failed(
                    "Compulsory fields are required for creating.", "BAD_REQUEST_INVALID_FIELDS");
            }

            if (await ExamTypeExists(createRequest.TypeName))
            {
                return BaseServiceResponse<ExamTypeCreateResponseDto>.Failed(
                    $"Type name {createRequest.TypeName} is already taken.", "EXAM_TYPE_NAME_DUPLICATE");
            }

            var examTypeEntity = _mapper.Map<ExamType>(createRequest);

            await _unitOfWork.ExamTypeRepository.InsertAsync(examTypeEntity);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("New exam type registered: {typeName}", createRequest.TypeName);

            var createResponseDto = _mapper.Map<ExamTypeCreateResponseDto>(examTypeEntity);
            return BaseServiceResponse<ExamTypeCreateResponseDto>.Success(createResponseDto, "Create successful.");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error during creation for exam type: {ID}", createRequest.TypeName);
            return BaseServiceResponse<ExamTypeCreateResponseDto>.Failed(
                $"Database error during creation: {ex.InnerException?.Message ?? ex.Message}", "DB_UPDATE_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during creation for exam type: {ID}", createRequest.TypeName);
            return BaseServiceResponse<ExamTypeCreateResponseDto>.Failed(
                "An unexpected error occurred during creation.", "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<ExamTypeResponseDto>> GetExamTypeByIdAsync(int examTypeId)
    {
        try
        {
            var examTypeEntity = await _unitOfWork.ExamTypeRepository.GetByIdAsync(new object[] { examTypeId });

            if (examTypeEntity == null)
            {
                return BaseServiceResponse<ExamTypeResponseDto>.Failed("Exam type to be retrieved cannot be found.",
                    "EXAM_TYPE_NOT_FOUND");
            }

            var examTypeResponseDto = _mapper.Map<ExamTypeResponseDto>(examTypeEntity);
            return BaseServiceResponse<ExamTypeResponseDto>.Success(examTypeResponseDto,
                "Exam type retrieved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting exam type with {id}", examTypeId);
            return BaseServiceResponse<ExamTypeResponseDto>.Failed(
                $"An error occured while retrieving exam type with ID {examTypeId}", "UNEXPECTED_ERROR");
        }
    }
    
    public async Task<BaseServiceResponse<IEnumerable<ExamTypeResponseDto>>> GetAllExamTypesAsync()
    {
        try
        {
            var examTypeEntities = await _unitOfWork.ExamTypeRepository.GetAllAsync();
        
            var examTypeResponseDtos = _mapper.Map<IEnumerable<ExamTypeResponseDto>>(examTypeEntities);
        
            return BaseServiceResponse<IEnumerable<ExamTypeResponseDto>>.Success(
                examTypeResponseDtos, 
                "Exam types retrieved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all exam types");
            return BaseServiceResponse<IEnumerable<ExamTypeResponseDto>>.Failed(
                "An error occurred while retrieving exam types.", 
                "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<bool>> UpdateExamTypeAsync(int examTypeId,
        ExamTypeUpdateDto updateRequest)
    {
        try
        {
            var examTypeEntity = await _unitOfWork.ExamTypeRepository.GetByIdAsync(new object[] { examTypeId });

            if (examTypeEntity == null)
            {
                return BaseServiceResponse<bool>.Failed("Exam type to be modified cannot be found.",
                    "EXAM_TYPE_NOT_FOUND");
            }

            bool changed = false;

            if (updateRequest.TypeName != null && updateRequest.TypeName != examTypeEntity.TypeName)
            {
                var existingExamType = await _unitOfWork.ExamTypeRepository.GetAsync(et =>
                    et.TypeName == updateRequest.TypeName && et.Id != examTypeEntity.Id);

                if (existingExamType.Any())
                {
                    return BaseServiceResponse<bool>.Failed(
                        $"The type name {updateRequest.TypeName} is already in use.", "EXAM_TYPE_NAME_DUPLICATE");
                }

                changed = true;
                examTypeEntity.TypeName = updateRequest.TypeName;
            }

            if (updateRequest.Description != null && updateRequest.Description != examTypeEntity.Description)
            {
                changed = true;
                examTypeEntity.Description = updateRequest.Description;
            }

            if (!changed)
            {
                return BaseServiceResponse<bool>.Success(true, "No changes detected to update.");
            }

            try
            {
                await _unitOfWork.ExamTypeRepository.UpdateAsync(examTypeEntity);
                await _unitOfWork.SaveAsync();
                return BaseServiceResponse<bool>.Success(true, "Exam type updated successfully.");
            }
            catch (DbUpdateConcurrencyException ex)
            {
                return BaseServiceResponse<bool>.Failed("Someone has changed the data. Try again please.",
                    "CONCURRENCY_ERROR");
            }
            catch (DbUpdateException ex)
            {
                return BaseServiceResponse<bool>.Failed(
                    $"Database error during update: {ex.InnerException?.Message ?? ex.Message}", "DB_UPDATE_ERROR");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during exam type's data update.");
                return BaseServiceResponse<bool>.Failed($"Unexpected error: {ex.Message}", "UNEXPECTED_ERROR");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating exam type with id: {examTypeId}", examTypeId);
            return BaseServiceResponse<bool>.Failed(
                $"An unexpected error occurred while updating exam type with ID {examTypeId}.", "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<string>> DeleteExamTypeAsync(int examTypeId)
    {
        try
        {
            await _unitOfWork.ExamTypeRepository.DeleteAsync(examTypeId);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation($"Exam type deleted successfully with ID {examTypeId}.");
            return BaseServiceResponse<string>.Success($"Exam type with ID {examTypeId} deleted successfully.",
                "Exam type deleted successfully.");
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Attempted to delete non-existing exam type with ID: {ExamTypeId}",
                examTypeId);
            return BaseServiceResponse<string>.Failed($"Exam type with ID {examTypeId} cannot be found.",
                "EXAM_TYPE_NOT_FOUND");
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex,
                "Concurrency conflicts when deleting exam type with ID {ExamTypeId}. Try again please.",
                examTypeId);
            return BaseServiceResponse<string>.Failed(
                $"The exam type has since been modified by someone else. Try again please.", "CONCURRENCY_ERROR");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error occurred while deleting exam type with ID {ExamTypeId}.",
                examTypeId);
            return BaseServiceResponse<string>.Failed(
                $"Database error during deleting: {ex.InnerException?.Message ?? ex.Message}", "DB_UPDATE_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while deleting exam type with ID {ExamTypeId}.",
                examTypeId);
            return BaseServiceResponse<string>.Failed($"Unexpected error: {ex.Message}", "UNEXPECTED_ERROR");
        }
    }

    private async Task<bool> ExamTypeExists(string typeName)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(typeName))
            {
                return false;
            }

            var examTypes = await _unitOfWork.ExamTypeRepository.GetAsync(et => et.TypeName == typeName.Trim());

            return examTypes.Any();
        }
        catch (Exception ex)
        {
            _logger.LogError("Error checking if exam type exists: {typeName}", typeName);
            throw;
        }
    }
}