using AutoMapper;
using ExamManager.Dtos;
using ExamManager.Dtos.ExaminerDtos;
using ExamManager.Dtos.ProfessionDtos;
using ExamManager.Interfaces;
using ExamManager.Models;
using ExamManager.Repositories;
using ExamManager.Responses;
using OfficeOpenXml;

namespace ExamManager.Services;

public class ImportService : IImportService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<ImportService> _logger;

    public ImportService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<ImportService> logger)
    {
        _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        ExcelPackage.License.SetNonCommercialPersonal("Sebestyén Marcell Achilles - Exam Manager");
    }

    public async Task<BaseServiceResponse<ImportResult>> ImportExaminersFromExcelAsync(Stream filestream)
    {
        var newExaminers = new List<Examiner>();
        var errors = new List<string>();
        int successCount = 0;

        try
        {
            using (var package = new ExcelPackage(filestream))
            {
                var worksheet = package.Workbook.Worksheets[0];
                var rowCount = worksheet.Dimension.Rows;
                
                var importDtos = new List<ExaminerCreateDto>();

                for (int row = 2; row <= rowCount; row++)
                {
                    var firstName = worksheet.Cells[row, 1].Value?.ToString()?.Trim();
                    var lastName = worksheet.Cells[row, 2].Value?.ToString()?.Trim();
                    var dateOfBirth = worksheet.Cells[row, 3].GetValue<DateTime?>();
                    var email = worksheet.Cells[row, 4].Value?.ToString()?.Trim();
                    var phoneCell = worksheet.Cells[row, 5];
                    string phoneNumber;

                    if (phoneCell.Value is double dVal)
                    {
                        phoneNumber = dVal.ToString("F0");
                    }
                    else
                    {
                        phoneNumber = phoneCell.Value?.ToString()?.Trim();
                    }
                    
                    var identityCardNumber = worksheet.Cells[row, 6].Value?.ToString()?.Trim();
                    
                    if (string.IsNullOrWhiteSpace(firstName))
                    {
                        errors.Add($"Row {row}: FirstName is required.");
                        continue;
                    }
                    
                    if (string.IsNullOrWhiteSpace(lastName))
                    {
                        errors.Add($"Row {row}: LastName is required.");
                        continue;
                    }
                    
                    if (dateOfBirth == null || dateOfBirth == default(DateTime))
                    {
                        errors.Add($"Row {row}: DateOfBirth is missing or invalid.");
                        continue;
                    }

                    if (dateOfBirth > DateTime.Now)
                    {
                        errors.Add($"Row {row}: DateOfBirth cannot be in the future.");
                        continue;
                    }
                    
                    if (string.IsNullOrWhiteSpace(email))
                    {
                        errors.Add($"Row {row}: Email is required.");
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(phoneNumber))
                    {
                        errors.Add($"Row {row}: Phone Number is required.");
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(identityCardNumber))
                    {
                        errors.Add($"Row {row}: Identity Card Number is required.");
                        continue;
                    }
                    
                    importDtos.Add(new ExaminerCreateDto
                    {
                        FirstName = firstName,
                        LastName = lastName,
                        DateOfBirth = DateTime.SpecifyKind(dateOfBirth.Value, DateTimeKind.Utc),
                        Email = email,
                        Phone = phoneNumber,
                        IdentityCardNumber = identityCardNumber
                    });
                }
                
                var allImportIds = importDtos.Select(x => x.IdentityCardNumber).ToList();
                
                var existingEntities =
                    await _unitOfWork.ExaminerRepository.GetAsync(e => allImportIds.Contains(e.IdentityCardNumber));
                
                var existingIds = new HashSet<string>(existingEntities.Select(e => e.IdentityCardNumber),
                    StringComparer.OrdinalIgnoreCase);

                foreach (var dto in importDtos)
                {
                    if (existingIds.Contains(dto.IdentityCardNumber))
                    {
                        errors.Add($"Skipped '{dto.IdentityCardNumber}': Already exists in database.");
                        continue;
                    }

                    if (newExaminers.Any(x => x.IdentityCardNumber.Equals(dto.IdentityCardNumber, StringComparison.OrdinalIgnoreCase)))
                    {
                        errors.Add($"Skipped '{dto.IdentityCardNumber}': Duplicate entry in file.");
                        continue;
                    }

                    var entity = _mapper.Map<Examiner>(dto);
                    newExaminers.Add(entity);
                }
                
                if (newExaminers.Any())
                {
                    foreach (var entity in newExaminers)
                    {
                        await _unitOfWork.ExaminerRepository.InsertAsync(entity);
                    }

                    await _unitOfWork.SaveAsync();
                    successCount = newExaminers.Count;
                }
            }
            
            return BaseServiceResponse<ImportResult>.Success(
                new ImportResult { SuccessCount = successCount, Errors = errors },
                $"Import completed. {successCount} added, {errors.Count} skipped."
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing exam types from Excel.");
            return BaseServiceResponse<ImportResult>.Failed(
                "An unexpected error occurred during import.", "IMPORT_ERROR");
        }
    }

    public async Task<BaseServiceResponse<ImportResult>> ImportExamTypesFromExcelAsync(Stream filestream)
    {
        var newExamTypes = new List<ExamType>();
        var errors = new List<string>();
        int successCount = 0;

        try
        {
            using (var package = new ExcelPackage(filestream))
            {
                var worksheet = package.Workbook.Worksheets[0];
                var rowCount = worksheet.Dimension.Rows;

                var importDtos = new List<ExamTypeCreateDto>();

                for (int row = 2; row <= rowCount; row++)
                {
                    var typeName = worksheet.Cells[row, 1].Value?.ToString()?.Trim();
                    var description = worksheet.Cells[row, 2].Value?.ToString()?.Trim();

                    if (string.IsNullOrWhiteSpace(typeName))
                    {
                        errors.Add($"Row {row}: TypeName is required.");
                        continue;
                    }

                    importDtos.Add(new ExamTypeCreateDto
                    {
                        TypeName = typeName,
                        Description = description
                    });
                }

                var allImportNames = importDtos.Select(x => x.TypeName).ToList();

                var existingEntities =
                    await _unitOfWork.ExamTypeRepository.GetAsync(et => allImportNames.Contains(et.TypeName));

                var existingNames = new HashSet<string>(existingEntities.Select(et => et.TypeName),
                    StringComparer.OrdinalIgnoreCase);

                foreach (var dto in importDtos)
                {
                    if (existingNames.Contains(dto.TypeName))
                    {
                        errors.Add($"Skipped '{dto.TypeName}': Already exists in database.");
                        continue;
                    }

                    if (newExamTypes.Any(x => x.TypeName.Equals(dto.TypeName, StringComparison.OrdinalIgnoreCase)))
                    {
                        errors.Add($"Skipped '{dto.TypeName}': Duplicate entry in file.");
                        continue;
                    }

                    var entity = _mapper.Map<ExamType>(dto);
                    newExamTypes.Add(entity);
                }

                if (newExamTypes.Any())
                {
                    foreach (var entity in newExamTypes)
                    {
                        await _unitOfWork.ExamTypeRepository.InsertAsync(entity);
                    }

                    await _unitOfWork.SaveAsync();
                    successCount = newExamTypes.Count;
                }
            }

            return BaseServiceResponse<ImportResult>.Success(
                new ImportResult { SuccessCount = successCount, Errors = errors },
                $"Import completed. {successCount} added, {errors.Count} skipped."
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing exam types from Excel.");
            return BaseServiceResponse<ImportResult>.Failed(
                "An unexpected error occurred during import.", "IMPORT_ERROR");
        }
    }
    
    public async Task<BaseServiceResponse<ImportResult>> ImportProfessionsFromExcelAsync(Stream filestream)
    {
        var newProfessions = new List<Profession>();
        var errors = new List<string>();
        var successCount = 0;

        try
        {
            using (var package = new ExcelPackage(filestream))
            {
                var worksheet = package.Workbook.Worksheets[0];
                var rowCount = worksheet.Dimension.Rows;

                var importDtos = new List<ProfessionCreateDto>();

                for (int row = 2; row <= rowCount; row++)
                {
                    var keorId = worksheet.Cells[row, 1].Value?.ToString()?.Trim();
                    var professionName = worksheet.Cells[row, 2].Value?.ToString()?.Trim();

                    if (string.IsNullOrWhiteSpace(keorId))
                    {
                        errors.Add($"Row {row}: KeorId is required.");
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(professionName))
                    {
                        errors.Add($"Row {row}: ProfessionName is required.");
                        continue;
                    }

                    importDtos.Add(new ProfessionCreateDto
                    {
                        KeorId = keorId,
                        ProfessionName = professionName
                    });
                }

                var allImportNames = importDtos.Select(x => x.KeorId).ToList();

                var existingEntities =
                    await _unitOfWork.ProfessionRepository.GetAsync(et => allImportNames.Contains(et.KeorId));

                var existingNames = new HashSet<string>(existingEntities.Select(et => et.KeorId),
                    StringComparer.OrdinalIgnoreCase);

                foreach (var dto in importDtos)
                {
                    if (existingNames.Contains(dto.KeorId))
                    {
                        errors.Add($"Skipped '{dto.KeorId}': Already exists in database.");
                        continue;
                    }

                    if (newProfessions.Any(x => x.KeorId.Equals(dto.KeorId, StringComparison.OrdinalIgnoreCase)))
                    {
                        errors.Add($"Skipped '{dto.KeorId}': Duplicate entry in file.");
                        continue;
                    }

                    var entity = _mapper.Map<Profession>(dto);
                    newProfessions.Add(entity);
                }

                if (newProfessions.Any())
                {
                    foreach (var entity in newProfessions)
                    {
                        await _unitOfWork.ProfessionRepository.InsertAsync(entity);
                    }

                    await _unitOfWork.SaveAsync();
                    successCount = newProfessions.Count;
                }
            }

            return BaseServiceResponse<ImportResult>.Success(
                new ImportResult { SuccessCount = successCount, Errors = errors },
                $"Import completed. {successCount} added, {errors.Count} skipped."
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing exam types from Excel.");
            return BaseServiceResponse<ImportResult>.Failed(
                "An unexpected error occurred during import.", "IMPORT_ERROR");
        }
    }

    public byte[] GenerateExaminersImportTemplate()
    {
        using (var package = new ExcelPackage())
        {
            var sheet = package.Workbook.Worksheets.Add("Examiner Import");

            sheet.Cells[1, 1].Value = "FirstName";
            sheet.Cells[1, 2].Value = "LastName";
            sheet.Cells[1, 3].Value = "DateOfBirth";
            sheet.Cells[1, 4].Value = "Email";
            sheet.Cells[1, 5].Value = "Phone";
            sheet.Column(5).Style.Numberformat.Format = "@";
            sheet.Cells[1, 6].Value = "IdentityCardNumber";

            using (var range = sheet.Cells[1, 1, 1, 6])
            {
                range.Style.Font.Bold = true;
                range.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
                range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGray);
            }

            sheet.Cells.AutoFitColumns();

            return package.GetAsByteArray();
        }
    }

    public byte[] GenerateExamTypesImportTemplate()
    {
        using (var package = new ExcelPackage())
        {
            var sheet = package.Workbook.Worksheets.Add("Exam Type Import");

            sheet.Cells[1, 1].Value = "TypeName";
            sheet.Cells[1, 2].Value = "Description";

            using (var range = sheet.Cells[1, 1, 1, 2])
            {
                range.Style.Font.Bold = true;
                range.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
                range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGray);
            }

            sheet.Cells.AutoFitColumns();

            return package.GetAsByteArray();
        }
    }

    public byte[] GenerateProfessionsImportTemplate()
    {
        using (var package = new ExcelPackage())
        {
            var sheet = package.Workbook.Worksheets.Add("Profession Import");
            
            sheet.Cells[1, 1].Value = "KeorId";
            sheet.Cells[1, 2].Value = "ProfessionName";

            using (var range = sheet.Cells[1, 1, 1, 2])
            {
                range.Style.Font.Bold = true;
                range.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
                range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGray);
            }
            
            sheet.Cells.AutoFitColumns();
            
            return package.GetAsByteArray();
        }
    }
}