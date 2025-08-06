using AutoMapper;
using ExamManager.Dtos.ProfessionDtos;
using ExamManager.Interfaces;
using ExamManager.Models;
using ExamManager.Repositories;
using ExamManager.Responses;
using ExamManager.Responses.ProfessionResponses;
using Microsoft.EntityFrameworkCore;

namespace ExamManager.Services;

public class ProfessionService : IProfessionService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<ProfessionService> _logger;
    private readonly IConfiguration _configuration;

    public ProfessionService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<ProfessionService> logger,
        IConfiguration configuration)
    {
        _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    }

    public async Task<BaseServiceResponse<ProfessionCreateResponseDto>> CreateProfessionAsync(
        ProfessionCreateDto createRequest)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(createRequest.KeorId) ||
                string.IsNullOrWhiteSpace(createRequest.ProfessionName))
            {
                return BaseServiceResponse<ProfessionCreateResponseDto>.Failed(
                    "All fields are required for creating.");
            }

            if (await ProfessionExists(createRequest.KeorId))
            {
                throw new InvalidOperationException(
                    $"Keor ID {createRequest.KeorId} is already taken.");
            }

            var professionEntity = _mapper.Map<Profession>(createRequest);

            await _unitOfWork.ProfessionRepository.InsertAsync(professionEntity);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("New profession registered: {KeorId}", createRequest.KeorId);

            var createResponseDto = _mapper.Map<ProfessionCreateResponseDto>(professionEntity);
            return BaseServiceResponse<ProfessionCreateResponseDto>.Success(createResponseDto, "Create successful.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during creation for profession: {ID}", createRequest.KeorId);
            return BaseServiceResponse<ProfessionCreateResponseDto>.Failed(
                "An unexpected error occurred during creation.");
        }
    }

    public async Task<BaseServiceResponse<ProfessionResponseDto>> GetProfessionByIdAsync(int professionId)
    {
        try
        {
            var professionEntity = await _unitOfWork.ProfessionRepository.GetByIdAsync(new object[] { professionId });

            if (professionEntity == null)
            {
                return BaseServiceResponse<ProfessionResponseDto>.Failed();
            }

            var professionResponseDto = _mapper.Map<ProfessionResponseDto>(professionEntity);
            return BaseServiceResponse<ProfessionResponseDto>.Success(professionResponseDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting profession with {id}", professionId);
            return BaseServiceResponse<ProfessionResponseDto>.Failed(
                $"An error occured while retrieving profession with ID {professionId}");
        }
    }

    public async Task<BaseServiceResponse<bool>> UpdateProfessionAsync(int professionId,
        ProfessionUpdateDto updateRequest)
    {
        try
        {
            var professionEntity = await _unitOfWork.ProfessionRepository.GetByIdAsync(new object[] { professionId });

            if (professionEntity == null)
            {
                return BaseServiceResponse<bool>.Failed("Profession to be modified cannot be found.");
            }

            bool changed = false;

            if (updateRequest.KeorId != null && updateRequest.KeorId != professionEntity.KeorId)
            {
                changed = true;
                professionEntity.KeorId = updateRequest.KeorId;
            }

            if (updateRequest.ProfessionName != null && updateRequest.ProfessionName != professionEntity.ProfessionName)
            {
                changed = true;
                professionEntity.ProfessionName = updateRequest.ProfessionName;
            }

            if (!changed)
            {
                return BaseServiceResponse<bool>.Success(true, "No changes detected to update.");
            }

            try
            {
                await _unitOfWork.ProfessionRepository.UpdateASync(professionEntity);
                await _unitOfWork.SaveAsync();
                return BaseServiceResponse<bool>.Success(true, "Profession updated successfully.");
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
                _logger.LogError(ex, "Unexpected error during profession's data update.");
                return BaseServiceResponse<bool>.Failed($"Unexpected error: {ex.Message}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating profession with id: {professionId}", professionId);
            return BaseServiceResponse<bool>.Failed(
                $"An unexpected error occurred while updating profession with ID {professionId}.");
        }
    }

    public async Task<BaseServiceResponse<string>> DeleteProfessionAsync(int professionId)
    {
        try
        {
            await _unitOfWork.ProfessionRepository.DeleteAsync(professionId);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation($"Profession deleted successfully with ID {professionId}.");
            return BaseServiceResponse<string>.Success($"Profession with ID {professionId} deleted successfully.");
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Attempted to delete non-existing profession with ID: {ProfessionId}",
                professionId);
            return BaseServiceResponse<string>.Failed($"Profession with ID {professionId} cannot be found.");
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex,
                "Concurrency conflicts when deleting profession with ID {ProfessionId}. Try again please.",
                professionId);
            return BaseServiceResponse<string>.Failed(
                $"The profession has since been modified by someone else. Try again please.");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error occurred while deleting profession with ID {ProfessionId}.",
                professionId);
            return BaseServiceResponse<string>.Failed(
                $"Database error during deleting: {ex.InnerException?.Message ?? ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while deleting profession with ID {ProfessionId}.",
                professionId);
            return BaseServiceResponse<string>.Failed($"Unexpected error: {ex.Message}");
        }
    }

    private async Task<bool> ProfessionExists(string keorId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(keorId))
            {
                return false;
            }

            var professions = await _unitOfWork.ProfessionRepository.GetAsync(p => p.KeorId == keorId);

            return professions.Any();
        }
        catch (Exception ex)
        {
            _logger.LogError("Error checking if profession exists: {KeorId}", keorId);
            throw;
        }
    }
}