using AutoMapper;
using ExamManager.Dtos.ExamBoardDtos;
using ExamManager.Dtos.ExamDtos;
using ExamManager.Interfaces;
using ExamManager.Models;
using ExamManager.Repositories;
using ExamManager.Responses;
using ExamManager.Responses.ExamResponses;
using Microsoft.EntityFrameworkCore;

namespace ExamManager.Services;

public class ExamService : IExamService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<ExamService> _logger;

    public ExamService(IUnitOfWork unitOfWork, IMapper mapper, ILogger<ExamService> logger)
    {
        _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<BaseServiceResponse<ExamCreateResponseDto>> CreateExamAsync(ExamCreateDto createRequest,
        int operatorId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(createRequest.ExamName) ||
                string.IsNullOrWhiteSpace(createRequest.ExamCode) ||
                createRequest.ExamDate == default(DateTime) ||
                createRequest.ExamDate > DateTime.Now ||
                !Enum.IsDefined(typeof(Status), createRequest.Status) ||
                createRequest.ProfessionId <= 0 ||
                createRequest.InstitutionId <= 0 ||
                createRequest.ExamTypeId <= 0 ||
                !createRequest.ExamBoards.Any())
            {
                return BaseServiceResponse<ExamCreateResponseDto>.Failed(
                    "All fields are required and must be valid for creating.", "BAD_REQUEST_INVALID_FIELDS");
            }

            if (await _unitOfWork.ProfessionRepository.GetByIdAsync(new object[] { createRequest.ProfessionId }) ==
                null)
            {
                return BaseServiceResponse<ExamCreateResponseDto>.Failed("The specified profession does not exist.",
                    "PROFESSION_NOT_FOUND");
            }

            if (await _unitOfWork.InstitutionRepository.GetByIdAsync(new object[] { createRequest.InstitutionId }) ==
                null)
            {
                return BaseServiceResponse<ExamCreateResponseDto>.Failed("The specified institution does not exist.",
                    "INSTITUTION_NOT_FOUND");
            }

            if (await _unitOfWork.ExamTypeRepository.GetByIdAsync(new object[] { createRequest.ExamTypeId }) == null)
            {
                return BaseServiceResponse<ExamCreateResponseDto>.Failed("The specified exam type does not exist.",
                    "EXAM_TYPE_NOT_FOUND");
            }

            if (await ExamExists(createRequest.ExamCode))
            {
                return BaseServiceResponse<ExamCreateResponseDto>.Failed(
                    $"Exam code '{createRequest.ExamCode}' is already taken.", "EXAM_CODE_DUPLICATE");
            }

            foreach (var board in createRequest.ExamBoards)
            {
                if (board.ExaminerId <= 0 || string.IsNullOrWhiteSpace(board.Role))
                {
                    return BaseServiceResponse<ExamCreateResponseDto>.Failed(
                        "Invalid examiner details in the exam board list.", "EXAM_BOARD_DETAILS_INVALID");
                }

                if (await _unitOfWork.ExaminerRepository.GetByIdAsync(new object[] { board.ExaminerId }) == null)
                {
                    return BaseServiceResponse<ExamCreateResponseDto>.Failed(
                        $"Examiner with ID '{board.ExaminerId}' does not exist.", "EXAMINER_NOT_FOUND");
                }
            }

            var examEntity = _mapper.Map<Exam>(createRequest);
            examEntity.OperatorId = operatorId;

            await _unitOfWork.ExamRepository.InsertAsync(examEntity);
            await _unitOfWork.SaveAsync();

            var examBoardEntities = createRequest.ExamBoards.Select(boardDto =>
            {
                var boardEntity = _mapper.Map<ExamBoard>(boardDto);
                boardEntity.ExamId = examEntity.Id;
                return boardEntity;
            }).ToList();
            await _unitOfWork.ExamBoardRepository.InsertRangeAsync(examBoardEntities);

            await _unitOfWork.SaveAsync();

            _logger.LogInformation("New exam registered: {examCode}", createRequest.ExamCode);

            var createResponseDto = _mapper.Map<ExamCreateResponseDto>(examEntity);
            createResponseDto.ExamBoards = _mapper.Map<List<ExamBoardResponseDto>>(examBoardEntities);

            return BaseServiceResponse<ExamCreateResponseDto>.Success(createResponseDto, "Create successful.");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error during exam creation for exam: {ExamCode}", createRequest.ExamCode);
            return BaseServiceResponse<ExamCreateResponseDto>.Failed(
                $"Database error during creation: {ex.InnerException?.Message ?? ex.Message}", "DB_UPDATE_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unexpected error occurred during exam creation for exam: {ExamCode}",
                createRequest.ExamCode);
            return BaseServiceResponse<ExamCreateResponseDto>.Failed("An unexpected error occurred during creation.",
                "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<ExamResponseDto>> GetExamByIdAsync(int examId)
    {
        try
        {
            string[] includeReferences = new[]
                { "Profession", "Institution", "ExamType", "Operator", "ExamBoard.Examiner" };
            var examEntity = (await _unitOfWork.ExamRepository.GetAsync(e => e.Id == examId, includeReferences))
                .FirstOrDefault();

            if (examEntity == null)
            {
                return BaseServiceResponse<ExamResponseDto>.Failed("Exam to be retrieved cannot be found.",
                    "EXAM_NOT_FOUND");
            }

            var examResponseDto = _mapper.Map<ExamResponseDto>(examEntity);
            return BaseServiceResponse<ExamResponseDto>.Success(examResponseDto, "Exam retrieved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting exam with ID {examId}", examId);
            return BaseServiceResponse<ExamResponseDto>.Failed(
                $"An error occurred while retrieving exam with ID {examId}", "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<bool>> UpdateExamAsync(int examId, ExamUpdateDto updateRequest)
    {
        try
        {
            var examEntity = await _unitOfWork.ExamRepository.GetByIdAsync(new object[] { examId });

            if (examEntity == null)
            {
                return BaseServiceResponse<bool>.Failed("Exam to be modified cannot be found.", "EXAM_NOT_FOUND");
            }

            bool changed = false;

            if (updateRequest.ExamName != null && updateRequest.ExamName != examEntity.ExamName)
            {
                changed = true;
                examEntity.ExamName = updateRequest.ExamName;
            }

            if (updateRequest.ExamCode != null && updateRequest.ExamCode != examEntity.ExamCode)
            {
                var existingExam =
                    await _unitOfWork.ExamRepository.GetAsync(e =>
                        e.ExamCode == updateRequest.ExamCode && e.Id != examId);

                if (existingExam.Any())
                {
                    return BaseServiceResponse<bool>.Failed(
                        $"The exam code '{updateRequest.ExamCode}' is already in use.", "EXAM_CODE_DUPLICATE");
                }

                changed = true;
                examEntity.ExamCode = updateRequest.ExamCode;
            }

            if (updateRequest.ExamDate.HasValue &&
                updateRequest.ExamDate != examEntity.ExamDate &&
                updateRequest.ExamDate <= DateTime.Now)
            {
                changed = true;
                examEntity.ExamDate = updateRequest.ExamDate.Value;
            }

            if (updateRequest.Status != null &&
                updateRequest.Status != examEntity.Status &&
                Enum.IsDefined(typeof(Status), updateRequest.Status))
            {
                changed = true;
                examEntity.Status = updateRequest.Status.Value;
            }

            if (updateRequest.ProfessionId.HasValue && updateRequest.ProfessionId.Value != examEntity.ProfessionId)
            {
                if (updateRequest.ProfessionId.Value <= 0)
                {
                    return BaseServiceResponse<bool>.Failed("The provided ProfessionId is invalid.",
                        "PROFESSION_ID_INVALID");
                }

                var professionExists =
                    await _unitOfWork.ProfessionRepository.GetByIdAsync(new object[]
                        { updateRequest.ProfessionId.Value });
                if (professionExists == null)
                {
                    return BaseServiceResponse<bool>.Failed("The specified ProfessionId does not exist.",
                        "PROFESSION_NOT_FOUND");
                }

                changed = true;
                examEntity.ProfessionId = updateRequest.ProfessionId.Value;
            }

            if (updateRequest.InstitutionId.HasValue && updateRequest.InstitutionId.Value != examEntity.InstitutionId)
            {
                if (updateRequest.InstitutionId.Value <= 0)
                {
                    return BaseServiceResponse<bool>.Failed("The provided InstitutionId is invalid.",
                        "INSTITUTION_ID_INVALID");
                }

                var institutionExists =
                    await _unitOfWork.InstitutionRepository.GetByIdAsync(new object[]
                        { updateRequest.InstitutionId.Value });
                if (institutionExists == null)
                {
                    return BaseServiceResponse<bool>.Failed("The specified InstitutionId does not exist.",
                        "INSTITUTION_NOT_FOUND");
                }

                changed = true;
                examEntity.InstitutionId = updateRequest.InstitutionId.Value;
            }

            if (updateRequest.ExamTypeId.HasValue && updateRequest.ExamTypeId.Value != examEntity.ExamTypeId)
            {
                if (updateRequest.ExamTypeId.Value <= 0)
                {
                    return BaseServiceResponse<bool>.Failed("The provided ExamTypeId is invalid.",
                        "EXAM_TYPE_ID_INVALID");
                }

                var examTypeExists =
                    await _unitOfWork.ExamTypeRepository.GetByIdAsync(new object[] { updateRequest.ExamTypeId.Value });
                if (examTypeExists == null)
                {
                    return BaseServiceResponse<bool>.Failed("The specified ExamTypeId does not exist.",
                        "EXAM_TYPE_NOT_FOUND");
                }

                changed = true;
                examEntity.ExamTypeId = updateRequest.ExamTypeId.Value;
            }

            if (updateRequest.ExamBoards != null && updateRequest.ExamBoards.Any())
            {
                var existingBoards =
                    (await _unitOfWork.ExamBoardRepository.GetAsync(eb => eb.ExamId == examId)).ToList();
                var existingExaminerIds = existingBoards.Select(eb => eb.ExaminerId).ToList();

                var requestExaminerIds = updateRequest.ExamBoards
                    .Where(eb => eb.ExaminerId.HasValue)
                    .Select(eb => eb.ExaminerId.Value)
                    .ToList();

                var examinersToAdd = requestExaminerIds.Except(existingExaminerIds).ToList();
                foreach (var examinerId in examinersToAdd)
                {
                    if (await _unitOfWork.ExaminerRepository.GetByIdAsync(new object[] { examinerId }) == null)
                    {
                        return BaseServiceResponse<bool>.Failed($"Examiner with ID '{examinerId}' does not exist.",
                            "EXAMINER_NOT_FOUND");
                    }

                    var newBoardDto = updateRequest.ExamBoards.First(eb => eb.ExaminerId == examinerId);
                    var newBoard = new ExamBoard
                    {
                        ExamId = examId,
                        ExaminerId = examinerId,
                        Role = newBoardDto.Role ?? string.Empty
                    };

                    await _unitOfWork.ExamBoardRepository.InsertAsync(newBoard);
                    changed = true;
                }

                var examinersToRemove = existingExaminerIds.Except(requestExaminerIds).ToList();
                if (examinersToRemove.Any())
                {
                    var boardsToRemove = existingBoards.Where(eb => examinersToRemove.Contains(eb.ExaminerId)).ToList();
                    await _unitOfWork.ExamBoardRepository.DeleteRangeAsync(boardsToRemove);
                    changed = true;
                }

                var examinersToUpdate = existingExaminerIds.Intersect(requestExaminerIds).ToList();
                foreach (var examinerId in examinersToUpdate)
                {
                    var existingBoard = existingBoards.First(eb => eb.ExaminerId == examinerId);
                    var updateBoardDto = updateRequest.ExamBoards.First(eb => eb.ExaminerId == examinerId);

                    if (updateBoardDto.Role != null && existingBoard.Role != updateBoardDto.Role)
                    {
                        existingBoard.Role = updateBoardDto.Role;
                        await _unitOfWork.ExamBoardRepository.UpdateAsync(existingBoard);
                        changed = true;
                    }
                }
            }

            if (!changed)
            {
                return BaseServiceResponse<bool>.Success(true, "No changes detected to update.");
            }

            try
            {
                await _unitOfWork.ExamRepository.UpdateAsync(examEntity);
                await _unitOfWork.SaveAsync();
                return BaseServiceResponse<bool>.Success(true, "Exam updated successfully.");
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
                _logger.LogError(ex, "Unexpected error during exam's data update.");
                return BaseServiceResponse<bool>.Failed($"Unexpected error: {ex.Message}", "UNEXPECTED_ERROR");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating exam with id: {examId}", examId);
            return BaseServiceResponse<bool>.Failed(
                $"An unexpected error occurred while updating exam with ID {examId}.", "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<string>> DeleteExamAsync(int examId, int? deletedById = null)
    {
        try
        {
            string[] includeCollections = new[] { "ExamBoard" };
            var examEntity = await _unitOfWork.ExamRepository.GetByIdAsync(
                new object[] { examId },
                null,
                includeCollections);

            if (examEntity == null)
            {
                return BaseServiceResponse<string>.Failed("Exam to be deleted cannot be found.", "EXAM_NOT_FOUND");
            }

            if (examEntity.IsDeleted)
            {
                return BaseServiceResponse<string>.Failed("The exam is already deleted.", "EXAM_ALREADY_DELETED");
            }

            examEntity.IsDeleted = true;
            examEntity.DeletedAt = DateTime.UtcNow;
            examEntity.DeletedById = deletedById;

            foreach (var examBoard in examEntity.ExamBoard.Where(eb => !eb.IsDeleted))
            {
                examBoard.IsDeleted = true;
                examBoard.DeletedAt = DateTime.UtcNow;
                examBoard.DeletedById = deletedById;
            }

            await _unitOfWork.ExamRepository.UpdateAsync(examEntity);

            if (examEntity.ExamBoard.Any(eb => eb.IsDeleted))
            {
                await _unitOfWork.ExamBoardRepository.UpdateRangeAsync(examEntity.ExamBoard);
            }

            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Deleted exam with id: {Id}", examId);
            return BaseServiceResponse<string>.Success($"Exam with ID {examId} deleted successfully.",
                "Exam deleted successfully.");
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Attempted to delete non-existing exam with ID: {ExamId}", examId);
            return BaseServiceResponse<string>.Failed($"Exam with ID {examId} cannot be found.", "EXAM_NOT_FOUND");
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex,
                "Concurrency conflicts when deleting exam with ID {ExamId}. Try again please.", examId);
            return BaseServiceResponse<string>.Failed(
                $"The exam has since been modified by someone else. Try again please.", "CONCURRENCY_ERROR");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error occurred while deleting exam with ID {ExamId}.", examId);
            return BaseServiceResponse<string>.Failed(
                $"Database error during deleting: {ex.InnerException?.Message ?? ex.Message}", "DB_UPDATE_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while deleting exam with ID {ExamId}.", examId);
            return BaseServiceResponse<string>.Failed($"Unexpected error: {ex.Message}", "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<string>> RestoreExamAsync(int examId)
    {
        try
        {
            string[] includeProperties = new[] { "ExamBoard" };
            var examEntity =
                (await _unitOfWork.ExamRepository.GetWithDeletedAsync(e => e.Id == examId, includeProperties))
                .FirstOrDefault();

            if (examEntity == null)
            {
                return BaseServiceResponse<string>.Failed("Exam to be restored cannot be found.", "EXAM_NOT_FOUND");
            }

            if (!examEntity.IsDeleted)
            {
                return BaseServiceResponse<string>.Failed("The exam is already restored.", "EXAM_ALREADY_RESTORED");
            }

            examEntity.IsDeleted = false;
            examEntity.DeletedAt = null;
            examEntity.DeletedById = null;
            
            var examBoardsToRestore = examEntity.ExamBoard.Where(eb => eb.IsDeleted).ToList();

            foreach (var examBoard in examBoardsToRestore)
            {
                examBoard.IsDeleted = false;
                examBoard.DeletedAt = null;
                examBoard.DeletedById = null;
            }

            await _unitOfWork.ExamRepository.UpdateAsync(examEntity);

            if (examBoardsToRestore.Any())
            {
                await _unitOfWork.ExamBoardRepository.UpdateRangeAsync(examBoardsToRestore);
            }
            
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Restored exam with id: {Id}", examId);
            return BaseServiceResponse<string>.Success($"Exam with ID {examId} restored successfully.",
                "Restore successful.");
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex,
                "Concurrency conflict when restoring exam with ID {ExamId}. Try again please.", examId);
            return BaseServiceResponse<string>.Failed(
                "The exam has since been modified by someone else. Try again please.", "CONCURRENCY_ERROR");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error occurred while restoring exam with ID {ExamId}.", examId);
            return BaseServiceResponse<string>.Failed(
                $"Database error during restoration: {ex.InnerException?.Message ?? ex.Message}", "DB_UPDATE_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while restoring exam with ID {ExamId}.",
                examId);
            return BaseServiceResponse<string>.Failed($"Unexpected error: {ex.Message}", "UNEXPECTED_ERROR");
        }
    }

    private async Task<bool> ExamExists(string examCode)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(examCode))
            {
                return false;
            }

            var exams = await _unitOfWork.ExamRepository.GetAsync(e => e.ExamCode == examCode.Trim());

            return exams.Any();
        }
        catch (Exception ex)
        {
            _logger.LogError("Error checking if exam exists {examId}", examCode);
            throw;
        }
    }
}