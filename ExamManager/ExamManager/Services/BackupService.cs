using System.Diagnostics;
using AutoMapper;
using ExamManager.Dtos.BackupHistoryDtos;
using ExamManager.Interfaces;
using ExamManager.Models;
using ExamManager.Repositories;
using ExamManager.Responses;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Drive.v3;
using Google.Apis.Services;

namespace ExamManager.Services;

public class BackupService : IBackupService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<BackupService> _logger;
    private readonly IConfiguration _configuration;
    private readonly IMapper _mapper;

    private const string DbName = "examdb";
    private const string DbUser = "adminuser";
    private const string DbPassword = "yourStrongPassword123!";

    public BackupService(IUnitOfWork unitOfWork, ILogger<BackupService> logger, IConfiguration configuration,
        IMapper mapper)
    {
        _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
    }

    public async Task<BaseServiceResponse<bool>> PerformManualBackupAsync(int operatorId)
    {
        return await ProcessBackupAsync(ActivityType.Manual, operatorId);
    }

    public async Task<BaseServiceResponse<bool>> PerformAutomaticBackupAsync()
    {
        var adminUserName = "admin@exam-manager.com";
        var admin = (await _unitOfWork.OperatorRepository
            .GetAsync(x => x.Role == Role.Admin || x.UserName == adminUserName)).FirstOrDefault();

        if (admin == null)
        {
            _logger.LogError("Automatic Backup Skipped: Default Admin user not found.");
            return BaseServiceResponse<bool>.Failed("Admin user missing", "NO_ADMIN");
        }

        var result = await ProcessBackupAsync(ActivityType.Auto, admin.Id);

        if (result.Succeeded)
        {
            await RotateBackupsAsync();
        }

        return result;
    }

    public async Task<BaseServiceResponse<bool>> RestoreBackupAsync(int backupId, int operatorId)
    {
        var targetBackup = 
            (await _unitOfWork.BackupHistoryRepository.GetAsync(x => x.Id == backupId)).FirstOrDefault();
        if (targetBackup == null)
        {
            return BaseServiceResponse<bool>.Failed("Backup record not found.", "NOT_FOUND");
        }
        string fileToRestore = targetBackup.FileName;
        
        await _unitOfWork.BackupHistoryRepository.DetachAsync(targetBackup);
        
        var localTempPath = Path.Combine(Path.GetTempPath(), targetBackup.FileName);

        var restoreLog = new BackupHistory
        {
            BackupDate = DateTime.UtcNow,
            FileName = targetBackup.FileName,
            ActivityType = ActivityType.Restore,
            OperatorId = operatorId,
            IsSuccessful = false,
        };
        
        try
        {
            _logger.LogInformation("Restoring: Downloading {File} from Google Drive...", fileToRestore);
            await DownloadFromDriveAsync(fileToRestore, localTempPath);

            _logger.LogInformation("Restoring: Applying database dump...");
            await RunPgRestoreAsync(localTempPath);

            await _unitOfWork.BackupHistoryRepository.ClearChangeTrackerAsync();
            
            restoreLog.IsSuccessful = true;

            _logger.LogInformation("Restore completed successfully.");
            
            await _unitOfWork.BackupHistoryRepository.InsertAsync(restoreLog);
            await _unitOfWork.SaveAsync();
            
            return BaseServiceResponse<bool>.Success(true, "Database restored successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Restore failed");
            return BaseServiceResponse<bool>.Failed($"Restore failed: {ex.Message}", "RESTORE_FAIL");
        }
        finally
        {
            if (File.Exists(localTempPath)) File.Delete(localTempPath);
        }
    }

    public async Task<BaseServiceResponse<IEnumerable<BackupHistoryResponseDto>>> GetAllBackupsAsync()
    {
        try
        {
            var backupEntities =
                await _unitOfWork.BackupHistoryRepository.GetAllAsync(includeProperties: new[] { "Operator" });

            var backupResponseDtos = _mapper.Map<IEnumerable<BackupHistoryResponseDto>>(backupEntities);

            return BaseServiceResponse<IEnumerable<BackupHistoryResponseDto>>.Success(
                backupResponseDtos,
                "Backups retrieved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all backups");
            return BaseServiceResponse<IEnumerable<BackupHistoryResponseDto>>.Failed(
                "An error occured while retrieving backups",
                "UNEXPECTED_ERROR");
        }
    }

    private async Task<BaseServiceResponse<bool>> ProcessBackupAsync(ActivityType activityType, int operatorId)
    {
        var fileName = $"backup_{DateTime.UtcNow:yyyyMMdd_HHmmss}.custom";
        var localTempPath = Path.Combine(Path.GetTempPath(), fileName);

        var historyLog = new BackupHistory()
        {
            BackupDate = DateTime.UtcNow,
            FileName = fileName,
            ActivityType = activityType,
            OperatorId = operatorId,
            IsSuccessful = true,
        };

        try
        {
            await RunPgDumpAsync(localTempPath);

            await UploadToDriveAsync(localTempPath, fileName);

            historyLog.IsSuccessful = true;
            return BaseServiceResponse<bool>.Success(true, "Backup completed successfully.");
        }
        catch (Exception ex)
        {
            historyLog.IsSuccessful = false;
            historyLog.ErrorMessage = ex.Message;
            _logger.LogError("Backup failed: {Error}", ex.Message);
            return BaseServiceResponse<bool>.Failed($"Backup failed: {ex.Message}", "BACKUP_FAIL");
        }
        finally
        {
            try
            {
                await _unitOfWork.BackupHistoryRepository.InsertAsync(historyLog);
                await _unitOfWork.SaveAsync();
            }
            catch (Exception dbEx)
            {
                Console.WriteLine($"Critical Error saving log: {dbEx.Message}");
            }

            if (File.Exists(localTempPath))
            {
                File.Delete(localTempPath);
            }
        }
    }

    private async Task RotateBackupsAsync()
    {
        try
        {
            var allAutoBackups =
                await _unitOfWork.BackupHistoryRepository.GetAsync(x => x.ActivityType == ActivityType.Auto);

            var orderedBackups = allAutoBackups.OrderByDescending(x => x.BackupDate).ToList();

            if (orderedBackups.Count > 7)
            {
                var backupsToDelete = orderedBackups.Skip(7).ToList();

                foreach (var backup in backupsToDelete)
                {
                    await _unitOfWork.BackupHistoryRepository.DeleteAsync(backup);
                }

                await _unitOfWork.SaveAsync();
                _logger.LogInformation($"Rotation: Cleaned up {backupsToDelete.Count} old backups.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Rotation Failed: {ex.Message}");
        }
    }

    private async Task RunPgDumpAsync(string outputPath)
    {
        var dockerPath = "/usr/local/bin/docker";
        var containerName = "postgresql";
        var arguments = $"exec -i -e PGPASSWORD={DbPassword} {containerName} pg_dump -U {DbUser} -F c {DbName}";

        var processInfo = new ProcessStartInfo
        {
            FileName = dockerPath,
            Arguments = arguments,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = processInfo };
        process.Start();

        using (var stream = new FileStream(outputPath, FileMode.Create))
        {
            await process.StandardOutput.BaseStream.CopyToAsync(stream);
        }

        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
        {
            var error = await process.StandardError.ReadToEndAsync();
            throw new Exception($"pg_dump failed: {error}");
        }

        if (!File.Exists(outputPath) || new FileInfo(outputPath).Length == 0)
        {
            throw new Exception("The backup file was not created or is empty.");
        }
    }

    private async Task UploadToDriveAsync(string localPath, string fileName)
    {
        var clientId = _configuration["GoogleDrive:ClientId"];
        var clientSecret = _configuration["GoogleDrive:ClientSecret"];
        var refreshToken = _configuration["RefreshToken"];
        var folderId = _configuration["GoogleDrive:FolderId"];

        var tokenResponse = new Google.Apis.Auth.OAuth2.Responses.TokenResponse
        {
            RefreshToken = refreshToken
        };

        var credential = new UserCredential(
            new GoogleAuthorizationCodeFlow(
                new GoogleAuthorizationCodeFlow.Initializer
                {
                    ClientSecrets = new ClientSecrets
                    {
                        ClientId = clientId,
                        ClientSecret = clientSecret
                    }
                }),
            "user",
            tokenResponse);

        var service = new DriveService(new BaseClientService.Initializer()
        {
            HttpClientInitializer = credential,
            ApplicationName = "ExamManager",
        });

        var fileMetadata = new Google.Apis.Drive.v3.Data.File()
        {
            Name = fileName,
            Parents = new List<string> { folderId }
        };

        using var uploadStream = new FileStream(localPath, FileMode.Open);

        var request = service.Files.Create(fileMetadata, uploadStream, "application/octet-stream");
        var result = await request.UploadAsync();

        if (result.Status != Google.Apis.Upload.UploadStatus.Completed)
        {
            throw new Exception($"Failed to upload backup to Google Drive, {result.Exception?.Message}");
        }
    }

    private async Task RunPgRestoreAsync(string inputFilePath)
    {
        var dockerPath = "/usr/local/bin/docker";
        var containerName = "postgresql";

        var arguments =
            $"exec -i -e PGPASSWORD={DbPassword} {containerName} pg_restore -U {DbUser} -d {DbName} --clean --if-exists --no-owner";

        var processInfo = new ProcessStartInfo
        {
            FileName = dockerPath,
            Arguments = arguments,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        
        using var process = new Process { StartInfo = processInfo };
        process.Start();
        
        using (var fileStream = new FileStream(inputFilePath, FileMode.Open, FileAccess.Read))
        {
            await fileStream.CopyToAsync(process.StandardInput.BaseStream);
        }
        process.StandardInput.Close();
        
        await process.WaitForExitAsync();
        
        if (process.ExitCode != 0)
        {
            var error = await process.StandardError.ReadToEndAsync();
            throw new Exception($"pg_restore failed: {error}");
        }
    }

    private async Task DownloadFromDriveAsync(string fileName, string localSavePath)
    {
        var service = GetDriveService();

        var listRequest = service.Files.List();
        listRequest.Q = $"name = '{fileName}' and trashed = false";
        listRequest.Fields = "files(id, name)";
        var files = await listRequest.ExecuteAsync();

        var file = files.Files.FirstOrDefault();
        if (file == null)
        {
            throw new Exception($"File: {fileName} not found in Google Drive.");
        }

        var request = service.Files.Get(file.Id);
        using (var fileStream = new FileStream(localSavePath, FileMode.Create, FileAccess.Write))
        {
            await request.DownloadAsync(fileStream);
        }
    }

    private DriveService GetDriveService()
    {
        var clientId = _configuration["GoogleDrive:ClientId"];
        var clientSecret = _configuration["GoogleDrive:ClientSecret"];
        var refreshToken = _configuration["RefreshToken"];

        var tokenResponse = new Google.Apis.Auth.OAuth2.Responses.TokenResponse { RefreshToken = refreshToken };
        var credential = new UserCredential(
            new GoogleAuthorizationCodeFlow(
                new GoogleAuthorizationCodeFlow.Initializer
                {
                    ClientSecrets = new ClientSecrets { ClientId = clientId, ClientSecret = clientSecret }
                }),
            "user", tokenResponse);

        return new DriveService(new BaseClientService.Initializer()
        {
            HttpClientInitializer = credential,
            ApplicationName = "ExamManager",
        });
    }
}