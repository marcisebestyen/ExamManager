using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using ExamManager.Data;
using ExamManager.Models;
using ExamManager.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using ExamManager.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<ExamDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"];

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey =
                new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(secretKey ?? throw new InvalidOperationException("JWT key not found."))),
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimTypes.NameIdentifier
        };
    });

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Berauto API", Version = "v1" });

    //swagger xml file
    var servicesAssemblyXmlFile = $"{typeof(MappingService).Assembly.GetName().Name}.xml";
    var servicesAssemblyXmlPath = Path.Combine(AppContext.BaseDirectory, servicesAssemblyXmlFile);
    if (File.Exists(servicesAssemblyXmlPath))
    {
        c.IncludeXmlComments(servicesAssemblyXmlPath);
    }

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please insert JWT token",
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        BearerFormat = "JWT",
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] { }
        }
    });
});

// Unit of Work registration
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// Repository registration 
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

// Service registrations

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ExamDbContext>();
        context.Database.Migrate();

        if (!context.Operators.Any(o => o.Role == Role.Admin))
        {
            var adminPasswordHash = BCrypt.Net.BCrypt.HashPassword("AdminPassword123#");
            var adminUser = new Operator
            {
                UserName = "Admin",
                Password = adminPasswordHash,
                FirstName = "Admin",
                LastName = "System",
                Role = Role.Admin
            };
            context.Operators.Add(adminUser);
            context.SaveChanges();
            Console.WriteLine("Default admin user initialized.");
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred seeding the DB.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "ExamManager.API v1"));
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();