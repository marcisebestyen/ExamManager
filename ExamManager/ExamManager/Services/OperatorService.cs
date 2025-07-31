using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AutoMapper;
using ExamManager.Dtos.OperatorDtos;
using ExamManager.Interfaces;
using ExamManager.Models;
using ExamManager.Repositories;
using ExamManager.Responses;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace ExamManager.Services;

public class OperatorService : IOperatorService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<OperatorService> _logger;
    private readonly IConfiguration _configuration;

    public OperatorService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<OperatorService> logger,
        IConfiguration configuration
    )
    {
        _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    }

    public async Task<OperatorLoginResponseDto?> LoginAsync(OperatorLoginRequestDto loginRequest)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(loginRequest.UserName) ||
                string.IsNullOrWhiteSpace(loginRequest.Password))
            {
                _logger.LogWarning("Login attempt with empty username or password");
                return null;
            }

            var operatorEntity =
                (await _unitOfWork.OperatorRepository.GetAsync(o => o.UserName == loginRequest.UserName.Trim()))
                .FirstOrDefault();

            if (operatorEntity == null)
            {
                _logger.LogWarning("Login attempt for non-existent user: {UserName}", loginRequest.UserName);
                return null;
            }

            if (!BCrypt.Net.BCrypt.Verify(loginRequest.Password, operatorEntity.Password))
            {
                _logger.LogWarning("Failed login attempt for user: {UserName}", loginRequest.UserName);
                return null;
            }

            var response = _mapper.Map<OperatorLoginResponseDto>(operatorEntity);
            response.Token = GenerateJwtToken(operatorEntity);

            _logger.LogInformation("Successful login for user: {UserName}", loginRequest.UserName);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login attempt for user: {UserName}", loginRequest.UserName);
            throw;
        }
    }

    public async Task<OperatorRegisterResponseDto> RegisterAsync(OperatorCreateDto createRequest)
    {
        try
        {
            if (
                string.IsNullOrWhiteSpace(createRequest.UserName) ||
                string.IsNullOrWhiteSpace(createRequest.Password) ||
                string.IsNullOrWhiteSpace(createRequest.FirstName) ||
                string.IsNullOrWhiteSpace(createRequest.LastName)
            )
            {
                throw new ArgumentException("All fields are required for registration");
            }

            if (await UserExistsAsync(createRequest.UserName))
            {
                throw new InvalidOperationException($"Username '{createRequest.UserName}' is already taken");
            }

            var operatorEntity = _mapper.Map<Operator>(createRequest);
            operatorEntity.Password = BCrypt.Net.BCrypt.HashPassword(createRequest.Password);

            await _unitOfWork.OperatorRepository.InsertAsync(operatorEntity);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("New operator registered: {UserName}", createRequest.UserName);

            return _mapper.Map<OperatorRegisterResponseDto>(operatorEntity);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during registration for user: {UserName}", createRequest.UserName);
            throw;
        }
    }

    public async Task<bool> UserExistsAsync(string userName)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(userName))
            {
                return false;
            }

            var operators = await _unitOfWork.OperatorRepository.GetAsync(o => o.UserName == userName.Trim());

            return operators.Any();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if user exists: {UserName}", userName);
            throw;
        }
    }

    public async Task<OperatorResponseDto?> GetOperatorByIdAsync(int id)
    {
        try
        {
            var operatorEntity = await _unitOfWork.OperatorRepository.GetByIdAsync(new object[] { id });

            if (operatorEntity == null)
            {
                return null;
            }

            return _mapper.Map<OperatorResponseDto>(operatorEntity);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting operator with id: {Id}", id);
            throw;
        }
    }

    public async Task<OperatorUpdateResponseDto> UpdateOperatorAsync(int operatorId, OperatorUpdateDto updateRequest)
    {
        try
        {
            var operatorEntity = await _unitOfWork.OperatorRepository.GetByIdAsync(new object[] { operatorId });

            if (operatorEntity == null)
            {
                return OperatorUpdateResponseDto.Failed("The user to be modified cannot be found.");
            }

            bool changed = false;

            if (updateRequest.FirstName != null && operatorEntity.FirstName != updateRequest.FirstName)
            {
                operatorEntity.FirstName = updateRequest.FirstName;
                changed = true;
            }

            if (updateRequest.LastName != null && operatorEntity.LastName != updateRequest.LastName)
            {
                operatorEntity.LastName = updateRequest.LastName;
                changed = true;
            }

            if (updateRequest.Role != null && operatorEntity.Role != updateRequest.Role)
            {
                operatorEntity.Role = updateRequest.Role.Value;
                changed = true;
            }

            if (!changed)
            {
                return OperatorUpdateResponseDto.Success();
            }

            try
            {
                await _unitOfWork.OperatorRepository.UpdateASync(operatorEntity);
                await _unitOfWork.SaveAsync();
                return OperatorUpdateResponseDto.Success();
            }
            catch (DbUpdateConcurrencyException)
            {
                return OperatorUpdateResponseDto.Failed("Someone has changed the data. Try again please.");
            }
            catch (DbUpdateException ex)
            {
                return OperatorUpdateResponseDto.Failed(
                    $"Database error during update: {ex.InnerException?.Message ?? ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during operator's data update.");
                return OperatorUpdateResponseDto.Failed($"Unexpected error: {ex.Message}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating operator with id: {operatorId}", operatorId);
            throw;
        }
    }

    public async Task<OperatorDeleteResponseDto> DeleteOperatorAsync(int operatorId, int? deletedById = null)
    {
        try
        {
            var operatorEntity = await _unitOfWork.OperatorRepository.GetByIdAsync(new object[] { operatorId });

            if (operatorEntity == null)
            {
                return OperatorDeleteResponseDto.Failed("The user to be deleted cannot be found.");
            }

            if (operatorEntity.IsDeleted)
            {
                return OperatorDeleteResponseDto.Failed("The operator is already deleted.");
            }

            operatorEntity.IsDeleted = true;
            operatorEntity.DeletedAt = DateTime.UtcNow;
            operatorEntity.DeletedById = deletedById;

            await _unitOfWork.OperatorRepository.UpdateASync(operatorEntity);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Deleted operator with id: {Id}", operatorId);
            return OperatorDeleteResponseDto.Success($"Operator with ID {operatorId} deleted successfully.");
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Attempted to delete non-existing operator with ID: {OperatorId}", operatorId);
            return OperatorDeleteResponseDto.Failed($"Operator with ID {operatorId} cannot be found.");
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex,
                "Concurrency conflicts when deleting operator with ID {OperatorId}. Try again please.", operatorId);
            return OperatorDeleteResponseDto.Failed(
                $"The operator has since been modified by someone else. Try again please.");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error occurred while deleting operator with ID {OperatorId}.", operatorId);
            return OperatorDeleteResponseDto.Failed(
                $"Database error during deleting: {ex.InnerException?.Message ?? ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while deleting operator with ID {OperatorId}.", operatorId);
            return OperatorDeleteResponseDto.Failed($"Unexpected error: {ex.Message}");
        }
    }

    public async Task<OperatorRestoreResponseDto> RestoreOperatorAsync(int operatorId)
    {
        try
        {
            var operatorEntity = (await _unitOfWork.OperatorRepository.GetWithDeletedAsync(o => o.Id == operatorId))
                .FirstOrDefault();

            if (operatorEntity == null)
            {
                return OperatorRestoreResponseDto.Failed("The operator to be restored cannot be found.");
            }

            if (!operatorEntity.IsDeleted)
            {
                return OperatorRestoreResponseDto.Failed("The operator is not currently deleted.");
            }

            operatorEntity.IsDeleted = false;
            operatorEntity.DeletedAt = null;
            operatorEntity.DeletedById = null;

            await _unitOfWork.OperatorRepository.UpdateASync(operatorEntity);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Restored operator with id: {Id}", operatorId);
            return OperatorRestoreResponseDto.Success($"Operator with ID {operatorId} restored successfully.");
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex,
                "Concurrency conflict when restoring operator with ID {OperatorId}. Try again please.", operatorId);
            return OperatorRestoreResponseDto.Failed(
                $"The operator has since been modified by someone else. Try again please.");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error occurred while restoring operator with ID {OperatorId}.", operatorId);
            return OperatorRestoreResponseDto.Failed(
                $"Database error during restoration: {ex.InnerException?.Message ?? ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while restoring operator with ID {OperatorId}.", operatorId);
            return OperatorRestoreResponseDto.Failed($"Unexpected error: {ex.Message}");
        }
    }

    private string GenerateJwtToken(Operator user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"];
        var issuer = jwtSettings["Issuer"];
        var audience = jwtSettings["Audience"];
        var expirationMinutesString = jwtSettings["ExpirationMinutes"];

        if (string.IsNullOrEmpty(secretKey) || string.IsNullOrEmpty(issuer) || string.IsNullOrEmpty(audience))
        {
            throw new InvalidOperationException("JWT settings are not properly configured.");
        }

        if (!int.TryParse(expirationMinutesString, out int expirationMinutes))
        {
            expirationMinutes = 60;
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(secretKey);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.UserName),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(expirationMinutes),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials =
                new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}