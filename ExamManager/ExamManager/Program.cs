using Microsoft.EntityFrameworkCore;
using ExamManager.Data;
using ExamManager.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<ExamDbContext>(options => 
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var services  = scope.ServiceProvider;
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
        var logger =  services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred seeding the DB.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();