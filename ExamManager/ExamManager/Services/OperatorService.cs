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
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };
        
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return  tokenHandler.WriteToken(token);
    }
}