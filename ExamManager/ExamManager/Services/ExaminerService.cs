using AutoMapper;
using ExamManager.Dtos.ExaminerDtos;
using ExamManager.Interfaces;
using ExamManager.Models;
using ExamManager.Repositories;
using ExamManager.Responses;
using ExamManager.Responses.ExaminerResponses;
using Microsoft.EntityFrameworkCore;

namespace ExamManager.Services;

public class ExaminerService : IExaminerService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<ExaminerService> _logger;

    public ExaminerService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<ExaminerService> logger)
    {
        _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<BaseServiceResponse<ExaminerCreateResponseDto>> CreateExaminerAsync(
        ExaminerCreateDto createRequest)
    {
        try
        {
            if (
                string.IsNullOrWhiteSpace(createRequest.FirstName) ||
                string.IsNullOrWhiteSpace(createRequest.LastName) ||
                createRequest.DateOfBirth == default(DateTime) ||
                createRequest.DateOfBirth > DateTime.Now ||
                string.IsNullOrWhiteSpace(createRequest.Email) ||
                string.IsNullOrWhiteSpace(createRequest.Phone) ||
                string.IsNullOrWhiteSpace(createRequest.IdentityCardNumber)
            )
            {
                return BaseServiceResponse<ExaminerCreateResponseDto>.Failed(
                    "All fields are required for creating.", "BAD_REQUEST_INVALID_FIELDS");
            }

            if (await ExaminerExists(createRequest.IdentityCardNumber))
            {
                return BaseServiceResponse<ExaminerCreateResponseDto>.Failed(
                    $"Identity card number '{createRequest.IdentityCardNumber}' is already taken",
                    "IDENTITY_CARD_DUPLICATE");
            }

            var examinerEntity = _mapper.Map<Examiner>(createRequest);

            await _unitOfWork.ExaminerRepository.InsertAsync(examinerEntity);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("New examiner registered: {FirstName} {LastName}, {ID}", createRequest.FirstName,
                createRequest.LastName, createRequest.IdentityCardNumber);

            var createResponseDto = _mapper.Map<ExaminerCreateResponseDto>(examinerEntity);
            return BaseServiceResponse<ExaminerCreateResponseDto>.Success(createResponseDto, "Create successful.");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error during creation for examiner: {ID}", createRequest.IdentityCardNumber);
            return BaseServiceResponse<ExaminerCreateResponseDto>.Failed(
                $"Database error during creation: {ex.InnerException?.Message ?? ex.Message}", "DB_UPDATE_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during creation for examiner: {ID}", createRequest.IdentityCardNumber);
            return BaseServiceResponse<ExaminerCreateResponseDto>.Failed(
                "An unexpected error occurred during creation.", "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<ExaminerResponseDto>> GetExaminerByIdAsync(int examinerId)
    {
        try
        {
            var examinerEntity = await _unitOfWork.ExaminerRepository.GetByIdAsync(new object[] { examinerId });

            if (examinerEntity == null)
            {
                return BaseServiceResponse<ExaminerResponseDto>.Failed("Examiner to be retrieved cannot be found.",
                    "EXAMINER_NOT_FOUND");
            }

            var examinerResponseDto = _mapper.Map<ExaminerResponseDto>(examinerEntity);
            return BaseServiceResponse<ExaminerResponseDto>.Success(examinerResponseDto,
                "Examiner retrieved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting examiner with ID {id}", examinerId);
            return BaseServiceResponse<ExaminerResponseDto>.Failed(
                $"An error occurred while retrieving examiner with ID {examinerId}", "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<bool>> UpdateExaminerAsync(int examinerId, ExaminerUpdateDto updateRequest)
    {
        try
        {
            var examinerEntity = await _unitOfWork.ExaminerRepository.GetByIdAsync(new object[] { examinerId });

            if (examinerEntity == null)
            {
                return BaseServiceResponse<bool>.Failed("Examiner to be modified cannot be found.",
                    "EXAMINER_NOT_FOUND");
            }

            bool changed = false;

            if (updateRequest.DateOfBirth.HasValue &&
                updateRequest.DateOfBirth != examinerEntity.DateOfBirth &&
                updateRequest.DateOfBirth <= DateTime.Now)
            {
                changed = true;
                examinerEntity.DateOfBirth = updateRequest.DateOfBirth.Value;
            }

            if (updateRequest.FirstName != null && updateRequest.FirstName != examinerEntity.FirstName)
            {
                changed = true;
                examinerEntity.FirstName = updateRequest.FirstName;
            }

            if (updateRequest.LastName != null && updateRequest.LastName != examinerEntity.LastName)
            {
                changed = true;
                examinerEntity.LastName = updateRequest.LastName;
            }

            if (updateRequest.Email != null && updateRequest.Email != examinerEntity.Email)
            {
                changed = true;
                examinerEntity.Email = updateRequest.Email;
            }

            if (updateRequest.Phone != null && updateRequest.Phone != examinerEntity.Phone)
            {
                changed = true;
                examinerEntity.Phone = updateRequest.Phone;
            }

            if (updateRequest.IdentityCardNumber != null &&
                updateRequest.IdentityCardNumber != examinerEntity.IdentityCardNumber)
            {
                var existingExaminer = await _unitOfWork.ExaminerRepository.GetAsync(ex =>
                    ex.IdentityCardNumber == updateRequest.IdentityCardNumber && ex.Id != examinerEntity.Id);

                if (existingExaminer.Any())
                {
                    return BaseServiceResponse<bool>.Failed(
                        $"The ID number {updateRequest.IdentityCardNumber} is already in use.",
                        "IDENTITY_CARD_DUPLICATE");
                }

                changed = true;
                examinerEntity.IdentityCardNumber = updateRequest.IdentityCardNumber;
            }

            if (!changed)
            {
                return BaseServiceResponse<bool>.Success(true, "No changes detected to update.");
            }

            try
            {
                await _unitOfWork.ExaminerRepository.UpdateAsync(examinerEntity);
                await _unitOfWork.SaveAsync();
                return BaseServiceResponse<bool>.Success(true, "Examiner updated successfully.");
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
                _logger.LogError(ex, "Unexpected error during examiner's data update.");
                return BaseServiceResponse<bool>.Failed($"Unexpected error: {ex.Message}", "UNEXPECTED_ERROR");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating examiner with id: {examinerId}", examinerId);
            return BaseServiceResponse<bool>.Failed(
                $"An unexpected error occurred while updating examiner with ID {examinerId}.", "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<string>> DeleteExaminerAsync(int examinerId, int? deletedById = null)
    {
        try
        {
            var examinerEntity = await _unitOfWork.ExaminerRepository.GetByIdAsync(new object[] { examinerId });

            if (examinerEntity == null)
            {
                return BaseServiceResponse<string>.Failed("Examiner to be deleted cannot be found.",
                    "EXAMINER_NOT_FOUND");
            }

            if (examinerEntity.IsDeleted)
            {
                return BaseServiceResponse<string>.Failed("The examiner is already deleted.",
                    "EXAMINER_ALREADY_DELETED");
            }

            examinerEntity.IsDeleted = true;
            examinerEntity.DeletedAt = DateTime.UtcNow;
            examinerEntity.DeletedById = deletedById;

            await _unitOfWork.ExaminerRepository.UpdateAsync(examinerEntity);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Deleted examiner with id: {Id}", examinerId);
            return BaseServiceResponse<string>.Success($"Examiner with ID {examinerId} deleted successfully.",
                "Examiner deleted successfully.");
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Attempted to delete non-existing examiner with ID: {ExaminerId}", examinerId);
            return BaseServiceResponse<string>.Failed($"Examiner with ID {examinerId} cannot be found.",
                "EXAMINER_NOT_FOUND");
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex,
                "Concurrency conflicts when deleting examiner with ID {ExaminerId}. Try again please.", examinerId);
            return BaseServiceResponse<string>.Failed(
                $"The examiner has since been modified by someone else. Try again please.", "CONCURRENCY_ERROR");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error occurred while deleting examiner with ID {ExaminerId}.", examinerId);
            return BaseServiceResponse<string>.Failed(
                $"Database error during deleting: {ex.InnerException?.Message ?? ex.Message}", "DB_UPDATE_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while deleting examiner with ID {ExaminerId}.", examinerId);
            return BaseServiceResponse<string>.Failed($"Unexpected error: {ex.Message}", "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<string>> RestoreExaminerAsync(int examinerId)
    {
        try
        {
            var examinerEntity = (await _unitOfWork.ExaminerRepository.GetWithDeletedAsync(ex => ex.Id == examinerId))
                .FirstOrDefault();

            if (examinerEntity == null)
            {
                return BaseServiceResponse<string>.Failed("Examiner to be restored cannot be found.",
                    "EXAMINER_NOT_FOUND");
            }

            if (!examinerEntity.IsDeleted)
            {
                return BaseServiceResponse<string>.Failed("The examiner is already restored.",
                    "EXAMINER_ALREADY_RESTORED");
            }

            examinerEntity.IsDeleted = false;
            examinerEntity.DeletedAt = null;
            examinerEntity.DeletedById = null;

            await _unitOfWork.ExaminerRepository.UpdateAsync(examinerEntity);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Restored examiner with id: {Id}", examinerId);
            return BaseServiceResponse<string>.Success($"Examiner with ID {examinerId} restored successfully.",
                "Restore successful.");
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex,
                "Concurrency conflict when restoring examiner with ID {ExaminerId}. Try again please.", examinerId);
            return BaseServiceResponse<string>.Failed(
                $"The examiner has since been modified by someone else. Try again please.", "CONCURRENCY_ERROR");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error occurred while restoring examiner with ID {ExaminerId}.", examinerId);
            return BaseServiceResponse<string>.Failed(
                $"Database error during restoration: {ex.InnerException?.Message ?? ex.Message}", "DB_UPDATE_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while restoring examiner with ID {ExaminerId}.",
                examinerId);
            return BaseServiceResponse<string>.Failed($"Unexpected error: {ex.Message}", "UNEXPECTED_ERROR");
        }
    }

    private async Task<bool> ExaminerExists(string identityCardNumber)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(identityCardNumber))
            {
                return false;
            }

            var examiners =
                await _unitOfWork.ExaminerRepository.GetAsync(ex => ex.IdentityCardNumber == identityCardNumber.Trim());

            return examiners.Any();
        }
        catch (Exception ex)
        {
            _logger.LogError("Error checking if examiner exists: {IDCardNumber}", identityCardNumber);
            throw;
        }
    }
}