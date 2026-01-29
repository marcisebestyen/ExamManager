using AutoMapper;
using ExamManager.Dtos.FileHistoryDtos;
using ExamManager.Interfaces;
using ExamManager.Models;
using ExamManager.Repositories;
using ExamManager.Responses;
using Microsoft.EntityFrameworkCore;

namespace ExamManager.Services;

public class FileHistoryService : IFileHistoryService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<FileHistoryService> _logger;
    private readonly IMapper _mapper;

    public FileHistoryService(IUnitOfWork unitOfWork, ILogger<FileHistoryService> logger, IMapper mapper)
    {
        _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
    }

    public async Task<BaseServiceResponse<FileHistoryResponseDto>> CreateFileHistoryAsync(
        FileHistoryCreateDto createRequest)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(createRequest.FileName) || 
                string.IsNullOrWhiteSpace(createRequest.ContentType) ||
                createRequest.FileContent == null || 
                createRequest.FileContent.Length == 0)
            {
                return BaseServiceResponse<FileHistoryResponseDto>.Failed(
                    "Filename, Content Type and File Content are required.", "BAD_REQUEST_INVALID_FIELDS");
            }

            var fileEntity = _mapper.Map<FileHistory>(createRequest);
            
            fileEntity.FileSizeInBytes = createRequest.FileContent.Length;
            fileEntity.CreatedAt = DateTime.UtcNow;

            await _unitOfWork.FileHistoryRepository.InsertAsync(fileEntity);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("New file history entry created: {FileName} ({Action})", 
                createRequest.FileName, createRequest.Action);

            var responseDto = _mapper.Map<FileHistoryResponseDto>(fileEntity);
            
            return BaseServiceResponse<FileHistoryResponseDto>.Success(responseDto, "Log entry created successfully.");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error during file history creation for file: {FileName}", createRequest.FileName);
            return BaseServiceResponse<FileHistoryResponseDto>.Failed(
                $"Database error during creation: {ex.InnerException?.Message ?? ex.Message}", "DB_UPDATE_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during file history creation for file: {FileName}", createRequest.FileName);
            return BaseServiceResponse<FileHistoryResponseDto>.Failed(
                "An unexpected error occurred during creation.", "UNEXPECTED_ERROR");
        }
    }
    
    public async Task<BaseServiceResponse<IEnumerable<FileHistoryResponseDto>>> GetAllFileHistoriesAsync()
    {
        try
        {
            string[] includeProperties = new[] { "Operator" };
            
            var historyEntities = await _unitOfWork.FileHistoryRepository.GetAllAsync(includeProperties);

            var sortedEntities = historyEntities.OrderByDescending(x => x.CreatedAt);

            var responseDtos = _mapper.Map<IEnumerable<FileHistoryResponseDto>>(sortedEntities);

            return BaseServiceResponse<IEnumerable<FileHistoryResponseDto>>.Success(
                responseDtos, 
                "File history retrieved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving file history.");
            return BaseServiceResponse<IEnumerable<FileHistoryResponseDto>>.Failed(
                "An unexpected error occurred while retrieving file history.", "UNEXPECTED_ERROR");
        }
    }
    
    public async Task<BaseServiceResponse<FileDownloadDto>> GetFileContentAsync(int id)
    {
        try
        {
            var fileEntity = await _unitOfWork.FileHistoryRepository.GetByIdAsync(new object[] { id });

            if (fileEntity == null)
            {
                return BaseServiceResponse<FileDownloadDto>.Failed("File entry not found.", "FILE_NOT_FOUND");
            }

            var downloadDto = new FileDownloadDto
            {
                FileName = fileEntity.FileName,
                ContentType = fileEntity.ContentType,
                FileContent = fileEntity.FileContent
            };

            return BaseServiceResponse<FileDownloadDto>.Success(downloadDto, "File retrieved.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving file content for ID {Id}", id);
            return BaseServiceResponse<FileDownloadDto>.Failed("Unexpected error.", "UNEXPECTED_ERROR");
        }
    }
}