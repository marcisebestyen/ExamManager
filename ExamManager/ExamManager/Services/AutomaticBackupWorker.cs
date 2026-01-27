using ExamManager.Interfaces;

namespace ExamManager.Services;

public class AutomaticBackupWorker : BackgroundService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<AutomaticBackupWorker> _logger;
    
    private readonly TimeSpan _period = TimeSpan.FromHours(24);
    
    public AutomaticBackupWorker(IServiceScopeFactory serviceScopeFactory, ILogger<AutomaticBackupWorker> logger)
    {
        _serviceScopeFactory = serviceScopeFactory ?? throw new ArgumentNullException(nameof(serviceScopeFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("Starting Automatic Backup Cycle...");

            using (var scope = _serviceScopeFactory.CreateScope())
            {
                var backupService = scope.ServiceProvider.GetRequiredService<IBackupService>();

                try
                {
                    await backupService.PerformAutomaticBackupAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "CRITICAL: Automatic Backup crashed.");
                }
            }
            
            await Task.Delay(_period, stoppingToken);
        }
    }
}