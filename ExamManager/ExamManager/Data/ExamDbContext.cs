using ExamManager.Models;
using Microsoft.EntityFrameworkCore;

namespace ExamManager.Data;

public class ExamDbContext : DbContext
{
    public ExamDbContext(DbContextOptions<ExamDbContext> options) : base(options)
    {
    }

    public DbSet<BackupHistory> BackupHistory { get; set; }
    public DbSet<Exam> Exams { get; set; }
    public DbSet<ExamBoard> ExamBoards { get; set; }
    public DbSet<Examiner> Examiners { get; set; }
    public DbSet<ExamType> ExamTypes { get; set; }
    public DbSet<Institution> Institutions { get; set; }
    public DbSet<Operator> Operators { get; set; }
    public DbSet<PasswordReset> PasswordResets { get; set; }
    public DbSet<Profession> Professions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ENUM CONVERSIONS 

        modelBuilder.Entity<BackupHistory>()
            .Property(b => b.ActivityType)
            .HasConversion<int>();

        modelBuilder.Entity<Exam>()
            .Property(e => e.Status)
            .HasConversion<int>();

        modelBuilder.Entity<Operator>()
            .Property(o => o.Role)
            .HasConversion<int>();
        
        modelBuilder.Entity<Exam>()
            .HasQueryFilter(e => !e.IsDeleted);
        
        modelBuilder.Entity<Examiner>()
            .HasQueryFilter(ex => !ex.IsDeleted);
        
        modelBuilder.Entity<ExamBoard>()
            .HasQueryFilter(eb => !eb.IsDeleted);
        
        modelBuilder.Entity<Operator>()
            .HasQueryFilter(op => !op.IsDeleted);

        // ENTITY CONFIGURATIONS

        // BackupHistory entity configuration
        modelBuilder.Entity<BackupHistory>(backupHistory =>
        {
            backupHistory.HasKey(bh => bh.Id); // PK
            
            backupHistory.HasIndex(bh => bh.FileName) // all filenames must be unique
                .IsUnique();
            backupHistory.Property(bh => bh.FileName)
                .HasMaxLength(256)
                .IsRequired();

            // foreign key setting
            backupHistory.HasOne(bh => bh.Operator)
                .WithMany()
                .HasForeignKey(bh => bh.OperatorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Exam entity configuration
        modelBuilder.Entity<Exam>(exam =>
        {
            exam.HasKey(e => e.Id); // PK
            
            exam.Property(e => e.ExamName)
                .HasMaxLength(256)
                .IsRequired();
            
            exam.HasIndex(e => e.ExamCode) 
                .IsUnique(); // index, unique business ID
            exam.Property(e => e.ExamCode)
                .HasMaxLength(256)
                .IsRequired();

            // foreign key settings
            // connection with Institution entity
            exam.HasOne(e => e.Institution)
                .WithMany()
                .HasForeignKey(e => e.InstitutionId)
                .OnDelete(DeleteBehavior.Restrict);

            // connection with ExamType entity
            exam.HasOne(e => e.ExamType)
                .WithMany()
                .HasForeignKey(e => e.ExamTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // connection with Profession entity
            exam.HasOne(e => e.Profession)
                .WithMany()
                .HasForeignKey(e => e.ProfessionId)
                .OnDelete(DeleteBehavior.Restrict);

            // connection with Operator entity
            exam.HasOne(e => e.Operator)
                .WithMany()
                .HasForeignKey(e => e.OperatorId)
                .OnDelete(DeleteBehavior.Restrict);
            
            exam.HasOne(e => e.DeletedBy)
                .WithMany()
                .HasForeignKey(e => e.DeletedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ExamBoards entity configuration 
        modelBuilder.Entity<ExamBoard>(examBoard =>
        {
            examBoard.HasKey(eb => new { eb.ExamId, eb.ExaminerId });
            
            examBoard.Property(eb => eb.Role)
                .HasMaxLength(100)
                .IsRequired();

            // connection with Exam entity, foreign key
            examBoard.HasOne(eb => eb.Exam)
                .WithMany(e => e.ExamBoard)
                .HasForeignKey(eb => eb.ExamId)
                .OnDelete(DeleteBehavior.Cascade);

            // connection with Examiner entity, foreign key
            examBoard.HasOne(eb => eb.Examiner)
                .WithMany(ex => ex.ExamBoard)
                .HasForeignKey(eb => eb.ExaminerId)
                .OnDelete(DeleteBehavior.Cascade);
            
            examBoard.HasOne(eb => eb.DeletedBy)
                .WithMany()
                .HasForeignKey(eb => eb.DeletedById)
                .OnDelete(DeleteBehavior.Restrict);
        });
        
        // Examiner entity configuration
        modelBuilder.Entity<Examiner>(examiner =>
        {
            examiner.HasKey(ex => ex.Id); // PK
            
            examiner.Property(ex => ex.FirstName)
                .HasMaxLength(256)
                .IsRequired();
            
            examiner.Property(ex => ex.LastName)
                .HasMaxLength(256)
                .IsRequired();
            
            examiner.HasIndex(ex => ex.IdentityCardNumber)
                .IsUnique(); // index, business ID 
            examiner.Property(ex => ex.IdentityCardNumber)
                .HasMaxLength(50)
                .IsRequired();
            
            examiner.HasIndex(ex => ex.Email)
                .IsUnique();
            examiner.Property(ex => ex.Email)
                .HasMaxLength(256)
                .IsRequired();
            
            examiner.HasIndex(ex => ex.Phone)
                .IsUnique();
            examiner.Property(ex => ex.Phone)
                .HasMaxLength(30)
                .IsRequired();

            examiner.HasOne(ex => ex.DeletedBy)
                .WithMany()
                .HasForeignKey(ex => ex.DeletedById)
                .OnDelete(DeleteBehavior.Restrict);
        });
        
        // ExamType entity configuration 
        modelBuilder.Entity<ExamType>(examType =>
        {
            examType.HasKey(et => et.Id);
            
            examType.HasIndex(et => et.TypeName)
                .IsUnique();
            examType.Property(et => et.TypeName)
                .HasMaxLength(256)
                .IsRequired();

            examType.Property(et => et.Description)
                .HasMaxLength(1000);
        });

        modelBuilder.Entity<FileHistory>(fileHistory =>
        {
            fileHistory.HasKey(fh => fh.Id); // PK
            
            fileHistory.Property(fh => fh.FileName)
                .HasMaxLength(256)
                .IsRequired();
            
            fileHistory.Property(fh => fh.ContentType)
                .HasMaxLength(256)
                .IsRequired();
        });
        
        // Institution entity configuration 
        modelBuilder.Entity<Institution>(institution =>
        {
            institution.HasKey(i => i.Id); // PK

            institution.HasIndex(i => i.EducationalId)
                .IsUnique();
            institution.Property(i => i.EducationalId)
                .HasMaxLength(256)
                .IsRequired();
            
            institution.Property(i => i.Name)
                .HasMaxLength(256)
                .IsRequired();
            
            institution.Property(i => i.ZipCode)
                .IsRequired();

            institution.Property(i => i.Town)
                .HasMaxLength(256)
                .IsRequired();
            
            institution.Property(i => i.Street)
                .HasMaxLength(256)
                .IsRequired();
            
            institution.Property(i => i.Number)
                .HasMaxLength(10)
                .IsRequired();

            institution.Property(i => i.Floor)
                .HasMaxLength(5);
            
            institution.Property(i => i.Door)
                .HasMaxLength(5);
        });
        
        // Operator entity configuration 
        modelBuilder.Entity<Operator>(oper =>
        {
            oper.HasKey(o => o.Id); // PK
            
            oper.HasIndex(o => o.UserName)
                .IsUnique();
            oper.Property(o => o.UserName)
                .HasMaxLength(256)
                .IsRequired();
            
            oper.Property(o => o.Password)
                .HasMaxLength(256)
                .IsRequired();
            
            oper.Property(o => o.FirstName)
                .HasMaxLength(256)
                .IsRequired();
            
            oper.Property(o => o.LastName)
                .HasMaxLength(256)
                .IsRequired();

            oper.Property(o => o.Role)
                .HasDefaultValue(Role.Operator);
        });
        
        // PasswordReset entity configuration 
        modelBuilder.Entity<PasswordReset>(password =>
        {
            password.HasKey(pr => pr.Id); // PK 
            
            password.HasIndex(pr => pr.Token)
                .IsUnique(); // index, business ID, every token must be unique
            password.Property(pr => pr.Token)
                .HasMaxLength(256)
                .IsRequired();
            
            // foreign key setting
            password.HasOne(pr => pr.Operator)
                .WithMany()
                .HasForeignKey(pr => pr.OperatorId)
                .OnDelete(DeleteBehavior.Restrict);
        });
        
        // Profession entity configuration 
        modelBuilder.Entity<Profession>(profession =>
        {
            profession.HasKey(prof => prof.Id); // PK
            
            profession.HasIndex(p => p.KeorId)
                .IsUnique(); // unique business ID, every KeorId must be unique
            profession.Property(p => p.KeorId)
                .HasMaxLength(256)
                .IsRequired();
            
            profession.Property(p => p.ProfessionName)
                .HasMaxLength(256)
                .IsRequired();
        });
    }
}