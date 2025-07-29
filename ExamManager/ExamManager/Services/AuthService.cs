using ExamManager.Models;
using ExamManager.Repositories;

namespace ExamManager.Services;

public class AuthService
{
    private readonly IRepository<Operator> _operatorRepository;
    private readonly JwtSettings _jwtSettings;

    public AuthService(IRepository<Operator> operatorRepository, JwtSettings jwtSettings)
    {
        _operatorRepository = operatorRepository ?? throw new ArgumentNullException(nameof(operatorRepository)); 
        _jwtSettings = jwtSettings ??  throw new ArgumentNullException(nameof(jwtSettings));
    }
}