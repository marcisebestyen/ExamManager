using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AutoMapper;
using ExamManager.Dtos.OperatorDtos;
using ExamManager.Interfaces;
using ExamManager.Models;
using ExamManager.Repositories;
using ExamManager.Responses;
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

    public async Task<BaseServiceResponse<OperatorLoginResponseDto>> LoginAsync(OperatorLoginRequestDto loginRequest)
    {
        if (string.IsNullOrWhiteSpace(loginRequest.UserName) ||
            string.IsNullOrWhiteSpace(loginRequest.Password))
        {
            _logger.LogWarning("Login attempt with empty username or password");
            return BaseServiceResponse<OperatorLoginResponseDto>.Failed("Username and password are required.",
                "BAD_REQUEST_INVALID_FIELDS");
        }

        try
        {
            var operatorEntity =
                (await _unitOfWork.OperatorRepository.GetAsync(o => o.UserName == loginRequest.UserName.Trim()))
                .FirstOrDefault();

            if (operatorEntity == null)
            {
                _logger.LogWarning("Login attempt for non-existent user: {UserName}", loginRequest.UserName);
                return BaseServiceResponse<OperatorLoginResponseDto>.Failed("Invalid username or password.",
                    "LOGIN_INVALID_CREDENTIALS");
            }

            if (!BCrypt.Net.BCrypt.Verify(loginRequest.Password, operatorEntity.Password))
            {
                _logger.LogWarning("Failed login attempt for user: {UserName}", loginRequest.UserName);
                return BaseServiceResponse<OperatorLoginResponseDto>.Failed("Invalid username or password.",
                    "LOGIN_INVALID_CREDENTIALS");
            }

            var loginResponseDto = _mapper.Map<OperatorLoginResponseDto>(operatorEntity);
            loginResponseDto.Token = GenerateJwtToken(operatorEntity);

            _logger.LogInformation("Successful login for user: {UserName}", loginRequest.UserName);
            return BaseServiceResponse<OperatorLoginResponseDto>.Success(loginResponseDto, "Login successful.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login attempt for user: {UserName}", loginRequest.UserName);
            return BaseServiceResponse<OperatorLoginResponseDto>.Failed("An unexpected error occurred during login.",
                "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<OperatorRegisterResponseDto>> RegisterAsync(OperatorCreateDto createRequest)
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
                return BaseServiceResponse<OperatorRegisterResponseDto>.Failed(
                    "All fields are required for registration.", "BAD_REQUEST_INVALID_FIELDS");
            }

            if (await OperatorExistsAsync(createRequest.UserName))
            {
                return BaseServiceResponse<OperatorRegisterResponseDto>.Failed(
                    $"Username '{createRequest.UserName}' is already taken", "USERNAME_DUPLICATE");
            }

            var operatorEntity = _mapper.Map<Operator>(createRequest);
            operatorEntity.Password = BCrypt.Net.BCrypt.HashPassword(createRequest.Password);

            await _unitOfWork.OperatorRepository.InsertAsync(operatorEntity);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("New operator registered: {UserName}", createRequest.UserName);

            var registerResponseDto = _mapper.Map<OperatorRegisterResponseDto>(operatorEntity);
            return BaseServiceResponse<OperatorRegisterResponseDto>.Success(registerResponseDto,
                "Registration successful.");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error during registration for user: {UserName}", createRequest.UserName);
            return BaseServiceResponse<OperatorRegisterResponseDto>.Failed(
                $"Database error during registration: {ex.InnerException?.Message ?? ex.Message}", "DB_UPDATE_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during registration for user: {UserName}", createRequest.UserName);
            return BaseServiceResponse<OperatorRegisterResponseDto>.Failed(
                "An unexpected error occurred during registration.", "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<OperatorResponseDto>> GetOperatorByIdAsync(int operatorId)
    {
        try
        {
            var operatorEntity = await _unitOfWork.OperatorRepository.GetByIdAsync(new object[] { operatorId });

            if (operatorEntity == null)
            {
                return BaseServiceResponse<OperatorResponseDto>.Failed(
                    $"Operator with ID {operatorId} cannot be found.", "OPERATOR_NOT_FOUND");
            }

            var operatorResponseDto = _mapper.Map<OperatorResponseDto>(operatorEntity);
            return BaseServiceResponse<OperatorResponseDto>.Success(operatorResponseDto,
                "Operator retrieved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting operator with id: {Id}", operatorId);
            return BaseServiceResponse<OperatorResponseDto>.Failed(
                $"An unexpected error occurred while retrieving operator with ID {operatorId}.", "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<IEnumerable<OperatorResponseDto>>> GetAllOperatorsAsync()
    {
        try
        {
            var operatorEntities = await _unitOfWork.OperatorRepository.GetAllAsync();

            var operatorResponseDtos = _mapper.Map<IEnumerable<OperatorResponseDto>>(operatorEntities);

            return BaseServiceResponse<IEnumerable<OperatorResponseDto>>.Success(
                operatorResponseDtos,
                "Operators retrieved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all operators");
            return BaseServiceResponse<IEnumerable<OperatorResponseDto>>.Failed(
                "An error occured while retrieving operators",
                "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<bool>> UpdateOperatorAsync(int operatorId, OperatorUpdateDto updateRequest)
    {
        try
        {
            var operatorEntity = await _unitOfWork.OperatorRepository.GetByIdAsync(new object[] { operatorId });

            if (operatorEntity == null)
            {
                return BaseServiceResponse<bool>.Failed("The user to be modified cannot be found.",
                    "OPERATOR_NOT_FOUND");
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

            // if (updateRequest.Email != null && operatorEntity.Email != updateRequest.Email)
            // {
            //     operatorEntity.Email = updateRequest.Email;
            //     changed = true;
            // }

            if (updateRequest.Role != null && operatorEntity.Role != updateRequest.Role)
            {
                operatorEntity.Role = updateRequest.Role.Value;
                changed = true;
            }

            if (!changed)
            {
                return BaseServiceResponse<bool>.Success(true, "No changes detected for update.");
            }

            try
            {
                await _unitOfWork.OperatorRepository.UpdateAsync(operatorEntity);
                await _unitOfWork.SaveAsync();
                return BaseServiceResponse<bool>.Success(true, "Operator updated successfully.");
            }
            catch (DbUpdateConcurrencyException)
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
                _logger.LogError(ex, "Unexpected error during operator's data update.");
                return BaseServiceResponse<bool>.Failed($"Unexpected error: {ex.Message}", "UNEXPECTED_ERROR");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating operator with id: {operatorId}", operatorId);
            return BaseServiceResponse<bool>.Failed(
                $"An unexpected error occurred while updating operator with ID {operatorId}.", "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<string>> DeleteOperatorAsync(int operatorId, int? deletedById = null)
    {
        try
        {
            var operatorEntity = await _unitOfWork.OperatorRepository.GetByIdAsync(new object[] { operatorId });

            if (operatorEntity == null)
            {
                return BaseServiceResponse<string>.Failed("The user to be deleted cannot be found.",
                    "OPERATOR_NOT_FOUND");
            }

            if (operatorEntity.IsDeleted)
            {
                return BaseServiceResponse<string>.Failed("The operator is already deleted.",
                    "OPERATOR_ALREADY_DELETED");
            }

            operatorEntity.IsDeleted = true;
            operatorEntity.DeletedAt = DateTime.UtcNow;
            operatorEntity.DeletedById = deletedById;

            await _unitOfWork.OperatorRepository.UpdateAsync(operatorEntity);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Deleted operator with id: {Id}", operatorId);
            return BaseServiceResponse<string>.Success($"Operator with ID {operatorId} deleted successfully.", "Operator deleted successfully.");
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Attempted to delete non-existing operator with ID: {OperatorId}", operatorId);
            return BaseServiceResponse<string>.Failed($"Operator with ID {operatorId} cannot be found.",
                "OPERATOR_NOT_FOUND");
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex,
                "Concurrency conflicts when deleting operator with ID {OperatorId}. Try again please.", operatorId);
            return BaseServiceResponse<string>.Failed(
                $"The operator has since been modified by someone else. Try again please.", "CONCURRENCY_ERROR");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error occurred while deleting operator with ID {OperatorId}.", operatorId);
            return BaseServiceResponse<string>.Failed(
                $"Database error during deleting: {ex.InnerException?.Message ?? ex.Message}", "DB_UPDATE_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while deleting operator with ID {OperatorId}.", operatorId);
            return BaseServiceResponse<string>.Failed($"Unexpected error: {ex.Message}", "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<string>> RestoreOperatorAsync(int operatorId)
    {
        try
        {
            var operatorEntity = (await _unitOfWork.OperatorRepository.GetWithDeletedAsync(o => o.Id == operatorId))
                .FirstOrDefault();

            if (operatorEntity == null)
            {
                return BaseServiceResponse<string>.Failed("The operator to be restored cannot be found.",
                    "OPERATOR_NOT_FOUND");
            }

            if (!operatorEntity.IsDeleted)
            {
                return BaseServiceResponse<string>.Failed("The operator is not currently deleted.",
                    "OPERATOR_NOT_DELETED");
            }

            operatorEntity.IsDeleted = false;
            operatorEntity.DeletedAt = null;
            operatorEntity.DeletedById = null;

            await _unitOfWork.OperatorRepository.UpdateAsync(operatorEntity);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Restored operator with id: {Id}", operatorId);
            return BaseServiceResponse<string>.Success($"Operator with ID {operatorId} restored successfully.", "Operator restores successfully.");
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex,
                "Concurrency conflict when restoring operator with ID {OperatorId}. Try again please.", operatorId);
            return BaseServiceResponse<string>.Failed(
                $"The operator has since been modified by someone else. Try again please.", "CONCURRENCY_ERROR");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error occurred while restoring operator with ID {OperatorId}.", operatorId);
            return BaseServiceResponse<string>.Failed(
                $"Database error during restoration: {ex.InnerException?.Message ?? ex.Message}", "DB_UPDATE_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while restoring operator with ID {OperatorId}.",
                operatorId);
            return BaseServiceResponse<string>.Failed($"Unexpected error: {ex.Message}", "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<string>> AssignRoleAsync(int targetOperatorId, Role newRole, int assignedById)
    {
        try
        {
            if (targetOperatorId <= 0)
            {
                return BaseServiceResponse<string>.Failed("Invalid target operator ID.", "BAD_REQUEST_INVALID_FIELDS");
            }

            var targetOperator = await _unitOfWork.OperatorRepository.GetByIdAsync(new object[] { targetOperatorId });
            if (targetOperator == null)
            {
                _logger.LogWarning("Role assignment failed: Target operator with ID {TargetOperatorId} not found.",
                    targetOperatorId);
                return BaseServiceResponse<string>.Failed($"Operator with ID {targetOperatorId} not found.",
                    "OPERATOR_NOT_FOUND");
            }

            var assigningAdmin = await _unitOfWork.OperatorRepository.GetByIdAsync(new object[] { assignedById });
            if (assigningAdmin == null || assigningAdmin.Role != Role.Admin)
            {
                _logger.LogWarning("Role assignment failed: Unauthorized attempt by non-admin user ID {AssignedById}.",
                    assignedById);
                return BaseServiceResponse<string>.Failed("Only administrators can assign or revoke roles.",
                    "UNAUTHORIZED_ROLE_ASSIGNMENT");
            }

            if (targetOperatorId == assignedById && newRole != Role.Admin && targetOperator.Role == Role.Admin)
            {
                return BaseServiceResponse<string>.Failed(
                    "An administrator cannot demote themselves to Operator role. Another admin must perform this action.",
                    "SELF_DEMOTION_FORBIDDEN");
            }

            if (targetOperatorId == assignedById && newRole == Role.Admin && targetOperator.Role == Role.Operator)
            {
                return BaseServiceResponse<string>.Failed(
                    "An administrator cannot promote themselves. This action is usually performed by another admin or during initial setup.",
                    "SELF_PROMOTION_FORBIDDEN");
            }

            if (targetOperator.Role == newRole)
            {
                return BaseServiceResponse<string>.Success(
                    $"Operator '{targetOperator.UserName}' (ID: {targetOperatorId}) already has the role '{newRole}'. No change needed.", "No change needed.");
            }

            var oldRole = targetOperator.Role;
            targetOperator.Role = newRole;

            await _unitOfWork.OperatorRepository.UpdateAsync(targetOperator);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation(
                "Admin '{AdminUserName}' (ID: {AssignedById}) changed role of operator '{TargetOperatorUserName}' (ID: {TargetOperatorId}) from '{OldRole}' to '{NewRole}'.",
                assigningAdmin.UserName, assignedById, targetOperator.UserName, targetOperatorId, oldRole, newRole);

            return BaseServiceResponse<string>.Success(
                $"Role of operator '{targetOperator.UserName}' (ID: {targetOperatorId}) successfully changed to '{newRole}'.", "Role successfully changed.");
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex, "Concurrency conflict during role assignment for operator ID {TargetOperatorId}.",
                targetOperatorId);
            return BaseServiceResponse<string>.Failed(
                "Concurrency conflict occurred. The operator's data was modified by someone else. Please try again.",
                "CONCURRENCY_ERROR");
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error occurred during role assignment for operator ID {TargetOperatorId}.",
                targetOperatorId);
            return BaseServiceResponse<string>.Failed(
                $"Database error during role assignment: {ex.InnerException?.Message ?? ex.Message}",
                "DB_UPDATE_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred during role assignment for operator ID {TargetOperatorId}.",
                targetOperatorId);
            return BaseServiceResponse<string>.Failed(
                $"An unexpected error occurred during role assignment: {ex.Message}", "UNEXPECTED_ERROR");
        }
    }

    private async Task<bool> OperatorExistsAsync(string userName)
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