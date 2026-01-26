using System.Diagnostics;
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
    
    private const string DbName = "examdb";
    private const string DbUser = "adminuser";
    private const string DbPassword = "yourStrongPassword123!";
    
    public BackupService(IUnitOfWork unitOfWork, ILogger<BackupService> logger, IConfiguration configuration)
    {
        _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    }

    public async Task<BaseServiceResponse<bool>> PerformManualBackup(int operatorId)
    {
        var fileName = $"backup_{DateTime.UtcNow:yyyyMMdd_HHmmss}.custom";
        var localTempPath = Path.Combine(Path.GetTempPath(), fileName);

        var historyLog = new BackupHistory()
        {
            BackupDate = DateTime.UtcNow,
            FileName = fileName,
            ActivityType = ActivityType.Manual,
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
}