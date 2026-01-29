using AutoMapper;
using ExamManager.Dtos;
using ExamManager.Dtos.ExaminerDtos;
using ExamManager.Dtos.FileHistoryDtos;
using ExamManager.Dtos.InstitutionDtos;
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
    IFileHistoryService _fileHistoryService;

    public ImportService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<ImportService> logger,
        IFileHistoryService fileHistoryService)
    {
        _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _fileHistoryService = fileHistoryService ?? throw new ArgumentNullException(nameof(fileHistoryService));

        ExcelPackage.License.SetNonCommercialPersonal("Sebestyén Marcell Achilles - Exam Manager");
    }
    
    // --- Importers ---

    public async Task<BaseServiceResponse<ImportResult>> ImportExamsFromExcelAsync(Stream filestream, int operatorId)
    {
        byte[] fileBytes;
        using (var memoryStream = new MemoryStream())
        {
            await filestream.CopyToAsync(memoryStream);
            fileBytes = memoryStream.ToArray();
            filestream.Position = 0; 
        }
        
        var newExams = new List<Exam>();
        var errors = new List<string>();
        var successCount = 0;

        try
        {
            var professions = await _unitOfWork.ProfessionRepository.GetAllAsync();
            var institutions = await _unitOfWork.InstitutionRepository.GetAllAsync();
            var examTypes = await _unitOfWork.ExamTypeRepository.GetAllAsync();
            var examiners = await _unitOfWork.ExaminerRepository.GetAllAsync();
            
            var professionMap = professions.ToDictionary(x => x.ProfessionName, x=> x.Id, StringComparer.OrdinalIgnoreCase);
            var institutionMap = institutions.ToDictionary(x => x.Name, x=> x.Id, StringComparer.OrdinalIgnoreCase);
            var examTypeMap = examTypes.ToDictionary(x => x.TypeName, x=> x.Id, StringComparer.OrdinalIgnoreCase);
            var examinerMap = examiners.ToDictionary(x => x.IdentityCardNumber, x=> x.Id, StringComparer.OrdinalIgnoreCase);

            using (var package = new ExcelPackage(filestream))
            {
                var worksheet = package.Workbook.Worksheets[0];
                var rowCount = worksheet.Dimension?.Rows ?? 0;
                
                for (int row = 2; row <= rowCount; row++)
                {
                    var examName = worksheet.Cells[row, 1].Value?.ToString()?.Trim();
                    var examCode = worksheet.Cells[row, 2].Value?.ToString()?.Trim();
                    var examDate = worksheet.Cells[row, 3].GetValue<DateTime?>();
                    var statusStr = worksheet.Cells[row, 4].Value?.ToString()?.Trim();
                    var profName = worksheet.Cells[row, 5].Value?.ToString()?.Trim();
                    var instName = worksheet.Cells[row, 6].Value?.ToString()?.Trim();
                    var typeName = worksheet.Cells[row, 7].Value?.ToString()?.Trim();
                    
                    if (string.IsNullOrWhiteSpace(examName) || string.IsNullOrWhiteSpace(examCode))
                    {
                        errors.Add($"Row {row}: Name and Code are required.");
                        continue;
                    }

                    if (examDate == null)
                    {
                        errors.Add($"Row {row}: Date is invalid.");
                        continue;
                    }
                    
                    if (!Enum.TryParse<Status>(statusStr, true, out var status))
                    {
                        status = Status.Planned; 
                    }
                    
                    if (string.IsNullOrWhiteSpace(profName) || !professionMap.TryGetValue(profName, out int profId))
                    {
                        errors.Add($"Row {row}: Profession '{profName}' not found.");
                        continue;
                    }
                    if (string.IsNullOrWhiteSpace(instName) || !institutionMap.TryGetValue(instName, out int instId))
                    {
                        errors.Add($"Row {row}: Institution '{instName}' not found.");
                        continue;
                    }
                    if (string.IsNullOrWhiteSpace(typeName) || !examTypeMap.TryGetValue(typeName, out int typeId))
                    {
                        errors.Add($"Row {row}: Exam Type '{typeName}' not found.");
                        continue;
                    }
                    
                    var exam = new Exam
                    {
                        ExamName = examName,
                        ExamCode = examCode,
                        ExamDate = DateTime.SpecifyKind(examDate.Value, DateTimeKind.Utc), 
                        Status = status,
                        ProfessionId = profId,
                        InstitutionId = instId,
                        ExamTypeId = typeId,
                        OperatorId = operatorId, 
                        ExamBoard = new List<ExamBoard>() 
                    };
                    
                    int[] examCols = { 8, 10, 12, 14, 16 };
                    bool boardError = false;
                    foreach (var colIndex in examCols)
                    {
                        var examinerString = worksheet.Cells[row, colIndex].Value?.ToString()?.Trim();
                        var role = worksheet.Cells[row, colIndex + 1].Value?.ToString()?.Trim();

                        if (string.IsNullOrWhiteSpace(examinerString)) continue;

                        if (string.IsNullOrWhiteSpace(role))
                        {
                            errors.Add($"Row {row}: Examiner selected in column {colIndex} but Role is missing.");
                            boardError = true; 
                            break;
                        }

                        var parts = examinerString.Split(',');
                        if (parts.Length < 2)
                        {
                            errors.Add($"Row {row}: Invalid examiner format in column {colIndex}. Expected 'Name, ID'.");
                            boardError = true; break;
                        }

                        var cardNum = parts.Last().Trim();

                        if (examinerMap.TryGetValue(cardNum, out int examinerId))
                        {
                            exam.ExamBoard.Add(new ExamBoard 
                            { 
                                ExaminerId = examinerId, 
                                Role = role 
                            });
                        }
                        else
                        {
                            errors.Add($"Row {row}: Examiner ID '{cardNum}' not found.");
                            boardError = true; break;
                        }
                    }
                    
                    if (boardError)
                    {
                        continue; 
                    }

                    if (!exam.ExamBoard.Any())
                    {
                        errors.Add($"Row {row}: At least one examiner is required.");
                        continue;
                    }
                    
                    newExams.Add(exam);
                }
                
                var incomingCodes = newExams.Select(e => e.ExamCode).ToList();
                var existingCodes = await _unitOfWork.ExamRepository.GetAsync(e => incomingCodes.Contains(e.ExamCode));
                var existingCodeSet = new HashSet<string>(existingCodes.Select(e => e.ExamCode), StringComparer.OrdinalIgnoreCase);

                var finalExamsToInsert = new List<Exam>();
                
                foreach (var exam in newExams)
                {
                    if (existingCodeSet.Contains(exam.ExamCode))
                    {
                        errors.Add($"Skipped '{exam.ExamCode}': Duplicate code in DB.");
                        continue;
                    }
                
                    if (finalExamsToInsert.Any(e => e.ExamCode.Equals(exam.ExamCode, StringComparison.OrdinalIgnoreCase)))
                    {
                        errors.Add($"Skipped '{exam.ExamCode}': Duplicate code in file.");
                        continue;
                    }

                    finalExamsToInsert.Add(exam);
                }
                
                if (finalExamsToInsert.Any())
                {
                    foreach (var exam in finalExamsToInsert)
                    {
                        await _unitOfWork.ExamRepository.InsertAsync(exam);
                    }
                
                    await _unitOfWork.SaveAsync();
                    successCount = finalExamsToInsert.Count;
                }
            }
            
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = $"Import_Exams_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Import,
                Category = FileCategory.Exam,
                OperatorId = operatorId,
                IsSuccessful = errors.Count == 0, 
                ProcessingNotes = $"Imported: {successCount}, Skipped/Errors: {errors.Count}"
            });
            
            return BaseServiceResponse<ImportResult>.Success(
                new ImportResult { SuccessCount = successCount, Errors = errors },
                $"Import completed. {successCount} added, {errors.Count} skipped.");
        }
        catch (Exception ex)
        {
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = $"Failed_Import_Exams_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Import,
                Category = FileCategory.Exam,
                OperatorId = operatorId,
                IsSuccessful = false,
                ProcessingNotes = $"CRITICAL ERROR: {ex.Message}"
            });
            
            _logger.LogError(ex, "Error importing exams from Excel.");
            return BaseServiceResponse<ImportResult>.Failed(
                "An unexpected error occurred during import.", "IMPORT_ERROR");
        }
    }

    public async Task<BaseServiceResponse<ImportResult>> ImportExaminersFromExcelAsync(Stream filestream, int operatorId)
    {
        byte[] fileBytes;
        using (var memoryStream = new MemoryStream())
        {
            await filestream.CopyToAsync(memoryStream);
            fileBytes = memoryStream.ToArray();
            filestream.Position = 0; 
        }
        
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
            
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = $"Import_Examiners_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Import,
                Category = FileCategory.Examiner,
                OperatorId = operatorId,
                IsSuccessful = errors.Count == 0, 
                ProcessingNotes = $"Imported: {successCount}, Skipped/Errors: {errors.Count}"
            });
            
            return BaseServiceResponse<ImportResult>.Success(
                new ImportResult { SuccessCount = successCount, Errors = errors },
                $"Import completed. {successCount} added, {errors.Count} skipped."
            );
        }
        catch (Exception ex)
        {
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = $"Failed_Import_Examiners_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Import,
                Category = FileCategory.Examiner,
                OperatorId = operatorId,
                IsSuccessful = false,
                ProcessingNotes = $"CRITICAL ERROR: {ex.Message}"
            });
            
            _logger.LogError(ex, "Error importing exam types from Excel.");
            return BaseServiceResponse<ImportResult>.Failed(
                "An unexpected error occurred during import.", "IMPORT_ERROR");
        }
    }

    public async Task<BaseServiceResponse<ImportResult>> ImportExamTypesFromExcelAsync(Stream filestream, int operatorId)
    {
        byte[] fileBytes;
        using (var memoryStream = new MemoryStream())
        {
            await filestream.CopyToAsync(memoryStream);
            fileBytes = memoryStream.ToArray();
            filestream.Position = 0; 
        }
        
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
            
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = $"Import_ExamTypes_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Import,
                Category = FileCategory.ExamType,
                OperatorId = operatorId,
                IsSuccessful = errors.Count == 0, 
                ProcessingNotes = $"Imported: {successCount}, Skipped/Errors: {errors.Count}"
            });

            return BaseServiceResponse<ImportResult>.Success(
                new ImportResult { SuccessCount = successCount, Errors = errors },
                $"Import completed. {successCount} added, {errors.Count} skipped."
            );
        }
        catch (Exception ex)
        {
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = $"Failed_Import_ExamTyepes_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Import,
                Category = FileCategory.ExamType,
                OperatorId = operatorId,
                IsSuccessful = false,
                ProcessingNotes = $"CRITICAL ERROR: {ex.Message}"
            });
            
            _logger.LogError(ex, "Error importing exam types from Excel.");
            return BaseServiceResponse<ImportResult>.Failed(
                "An unexpected error occurred during import.", "IMPORT_ERROR");
        }
    }

    public async Task<BaseServiceResponse<ImportResult>> ImportInstitutionsFromExcelAsync(Stream filestream, int operatorId)
    {
        byte[] fileBytes;
        using (var memoryStream = new MemoryStream())
        {
            await filestream.CopyToAsync(memoryStream);
            fileBytes = memoryStream.ToArray();
            filestream.Position = 0; 
        }
        
        var newInstitutions = new List<Institution>();
        var errors = new List<string>();
        int successCount = 0;

        try
        {
            using (var package = new ExcelPackage(filestream))
            {
                var worksheet = package.Workbook.Worksheets[0];
                var rowCount = worksheet.Dimension.Rows;
                
                var importDtos = new List<InstitutionCreateDto>();

                for (int row = 2; row <= rowCount; row++)
                {
                    var educationalId = worksheet.Cells[row, 1].Value?.ToString()?.Trim();
                    var name = worksheet.Cells[row, 2].Value?.ToString()?.Trim();
                    var zipCode = worksheet.Cells[row, 3].GetValue<int?>();
                    var town = worksheet.Cells[row, 4].Value?.ToString()?.Trim();
                    var street = worksheet.Cells[row, 5].Value?.ToString()?.Trim();
                    var number = worksheet.Cells[row, 6].Value?.ToString()?.Trim();
                    var floor = worksheet.Cells[row, 7].Value?.ToString()?.Trim();
                    var door = worksheet.Cells[row, 8].Value?.ToString()?.Trim();

                    if (string.IsNullOrWhiteSpace(educationalId))
                    {
                        errors.Add($"Row {row}: Educational Id is required.");
                        continue;
                    }
                    
                    if (string.IsNullOrWhiteSpace(name))
                    {
                        errors.Add($"Row {row}: Name is required.");
                        continue;
                    }

                    if (zipCode == null)
                    {
                        errors.Add($"Row {row}: Zip Code is invalid or empty.");
                        continue;
                    }

                    if (zipCode <= 0)
                    {
                        errors.Add($"Row {row}: Zip Code must be a positive number.");
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(town))
                    {
                        errors.Add($"Row {row}: Town is required.");
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(street))
                    {
                        errors.Add($"Row {row}: Street is required.");
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(number))
                    {
                        errors.Add($"Row {row}: Number is required.");
                        continue;
                    }
                    
                    importDtos.Add(new InstitutionCreateDto
                    {
                        EducationalId = educationalId,
                        Name = name,
                        ZipCode = zipCode.Value,
                        Town = town,
                        Street = street,
                        Number = number,
                        Floor = floor,
                        Door = door
                    });
                }
                
                var allImportIds = importDtos.Select(x => x.EducationalId).ToList();

                var existingEntities =
                    await _unitOfWork.InstitutionRepository.GetAsync(et => allImportIds.Contains(et.EducationalId));

                var existingIds = new HashSet<string>(existingEntities.Select(et => et.EducationalId),
                    StringComparer.OrdinalIgnoreCase);
                
                foreach (var dto in importDtos)
                {
                    if (existingIds.Contains(dto.EducationalId))
                    {
                        errors.Add($"Skipped '{dto.EducationalId}': Already exists in database.");
                        continue;
                    }

                    if (newInstitutions.Any(x => x.EducationalId.Equals(dto.EducationalId, StringComparison.OrdinalIgnoreCase)))
                    {
                        errors.Add($"Skipped '{dto.EducationalId}': Duplicate entry in file.");
                        continue;
                    }

                    var entity = _mapper.Map<Institution>(dto);
                    newInstitutions.Add(entity);
                }
                
                if (newInstitutions.Any())
                {
                    foreach (var entity in newInstitutions)
                    {
                        await _unitOfWork.InstitutionRepository.InsertAsync(entity);
                    }

                    await _unitOfWork.SaveAsync();
                    successCount = newInstitutions.Count;
                }
            }
            
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = $"Import_Institutions_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Import,
                Category = FileCategory.Institution,
                OperatorId = operatorId,
                IsSuccessful = errors.Count == 0, 
                ProcessingNotes = $"Imported: {successCount}, Skipped/Errors: {errors.Count}"
            });
            
            return BaseServiceResponse<ImportResult>.Success(
                new ImportResult { SuccessCount = successCount, Errors = errors },
                $"Import completed. {successCount} added, {errors.Count} skipped."
            );
        }
        catch (Exception ex)
        {
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = $"Failed_Import_Institutions_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Import,
                Category = FileCategory.Institution,
                OperatorId = operatorId,
                IsSuccessful = false,
                ProcessingNotes = $"CRITICAL ERROR: {ex.Message}"
            });
            
            _logger.LogError(ex, "Error importing exam types from Excel.");
            return BaseServiceResponse<ImportResult>.Failed(
                "An unexpected error occurred during import.", "IMPORT_ERROR");
        }
    }
    
    public async Task<BaseServiceResponse<ImportResult>> ImportProfessionsFromExcelAsync(Stream filestream, int operatorId)
    {
        byte[] fileBytes;
        using (var memoryStream = new MemoryStream())
        {
            await filestream.CopyToAsync(memoryStream);
            fileBytes = memoryStream.ToArray();
            filestream.Position = 0; 
        }
        
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
            
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = $"Import_Professions_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Import,
                Category = FileCategory.Profession,
                OperatorId = operatorId,
                IsSuccessful = errors.Count == 0, 
                ProcessingNotes = $"Imported: {successCount}, Skipped/Errors: {errors.Count}"
            });

            return BaseServiceResponse<ImportResult>.Success(
                new ImportResult { SuccessCount = successCount, Errors = errors },
                $"Import completed. {successCount} added, {errors.Count} skipped."
            );
        }
        catch (Exception ex)
        {
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = $"Failed_Import_Professions_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Import,
                Category = FileCategory.Profession,
                OperatorId = operatorId,
                IsSuccessful = false,
                ProcessingNotes = $"CRITICAL ERROR: {ex.Message}"
            });
            
            _logger.LogError(ex, "Error importing institutions from Excel.");
            return BaseServiceResponse<ImportResult>.Failed(
                "An unexpected error occurred during import.", "IMPORT_ERROR");
        }
    }

    // --- Template Generators ---
    
    public async Task<byte[]> GenerateExamsImportTemplate(int operatorId)
    {
        var professions = _unitOfWork.ProfessionRepository.GetAllAsync().Result;
        var institutions = _unitOfWork.InstitutionRepository.GetAllAsync().Result;
        var examTypes = _unitOfWork.ExamTypeRepository.GetAllAsync().Result;
        var examiners = _unitOfWork.ExaminerRepository.GetAllAsync().Result;
        
        using (var package = new ExcelPackage())
        {
            var sheet = package.Workbook.Worksheets.Add("Exam Import");

            sheet.Cells[1, 1].Value = "Exam Name";
            sheet.Cells[1, 2].Value = "Exam Code";
            sheet.Cells[1, 3].Value = "Date (YYYY-MM-DD)";
            sheet.Cells[1, 4].Value = "Status";
            sheet.Cells[1, 5].Value = "Profession";
            sheet.Cells[1, 6].Value = "Institution";
            sheet.Cells[1, 7].Value = "Exam Type";
            
            sheet.Cells[1, 8].Value = "Examiner 1";
            sheet.Cells[1, 9].Value = "Role 1";
            sheet.Cells[1, 10].Value = "Examiner 2";
            sheet.Cells[1, 11].Value = "Role 2";
            sheet.Cells[1, 12].Value = "Examiner 3";
            sheet.Cells[1, 13].Value = "Role 3";
            sheet.Cells[1, 14].Value = "Examiner 4";
            sheet.Cells[1, 15].Value = "Role 4";
            sheet.Cells[1, 16].Value = "Examiner 5";
            sheet.Cells[1, 17].Value = "Role 5";
            
            var refSheet = package.Workbook.Worksheets.Add("RefData");
            refSheet.Hidden = eWorkSheetHidden.Hidden;

            var statuses = Enum.GetNames(typeof(Status));
            for (int i = 0; i < statuses.Length; i++)
            {
                refSheet.Cells[i + 1, 1].Value = statuses[i];
            }

            var profList = professions.ToList();
            for (int i = 0; i < profList.Count; i++)
            {
                refSheet.Cells[i + 1, 2].Value = profList[i].ProfessionName;
            }
            
            var instList = institutions.ToList();
            for (int i = 0; i < instList.Count; i++)
            {
                refSheet.Cells[i + 1, 3].Value = instList[i].Name;
            }
            
            var typeList = examTypes.ToList();
            for (int i = 0; i < typeList.Count; i++)
            {
                refSheet.Cells[i + 1, 4].Value = typeList[i].TypeName;
            }

            var examinerList = examiners.Select(e => $"{e.LastName} {e.FirstName}, {e.IdentityCardNumber}").ToList();
            for (int i = 0; i < examinerList.Count; i++)
            {
                refSheet.Cells[i + 1, 5].Value = examinerList[i];
            }
            
            var roles = new[] { "Chief Examiner", "Deputy Chief Examiner", "Examiner", "Assistant Examiner", "External Examiner" };
            for (int i = 0; i < roles.Length; i++)
            {
                refSheet.Cells[i + 1, 6].Value = roles[i];
            }
            
            void AddValidation(int colIndex, string refCol, int count)
            {
                if (count == 0) return;
                var val = sheet.DataValidations.AddListValidation(sheet.Cells[2, colIndex, 1000, colIndex].Address);
                val.Formula.ExcelFormula = $"RefData!${refCol}$1:${refCol}${count}";
            }
            
            AddValidation(4, "A", statuses.Length);   
            AddValidation(5, "B", profList.Count);   
            AddValidation(6, "C", instList.Count);   
            AddValidation(7, "D", typeList.Count);   

            AddValidation(8, "E", examinerList.Count);
            AddValidation(10, "E", examinerList.Count);
            AddValidation(12, "E", examinerList.Count);
            AddValidation(14, "E", examinerList.Count);
            AddValidation(16, "E", examinerList.Count);

            AddValidation(9, "F", roles.Length);
            AddValidation(11, "F", roles.Length);
            AddValidation(13, "F", roles.Length);
            AddValidation(15, "F", roles.Length);
            AddValidation(17, "F", roles.Length);
            
            using (var range = sheet.Cells[1, 1, 1, 17])
            {
                range.Style.Font.Bold = true;
                range.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
                range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGray);
            }
            
            sheet.Cells.AutoFitColumns();
            
            var fileBytes = package.GetAsByteArray();
            
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = "Template_Exams.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.DownloadTemplate,
                Category = FileCategory.Exam,
                OperatorId = operatorId,
                IsSuccessful = true,
                ProcessingNotes = "Template generated"
            });

            return fileBytes;
        }
    }

    public async Task<byte[]> GenerateExaminersImportTemplate(int operatorId)
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

            var fileBytes = package.GetAsByteArray();
            
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = "Template_Examiners.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.DownloadTemplate,
                Category = FileCategory.Examiner,
                OperatorId = operatorId,
                IsSuccessful = true,
                ProcessingNotes = "Template generated"
            });

            return fileBytes;
        }
    }

    public async Task<byte[]> GenerateExamTypesImportTemplate(int operatorId)
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

            var fileBytes = package.GetAsByteArray();
            
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = "Template_ExamTypes.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.DownloadTemplate,
                Category = FileCategory.ExamType,
                OperatorId = operatorId,
                IsSuccessful = true,
                ProcessingNotes = "Template generated"
            });

            return fileBytes;
        }
    }

    public async Task<byte[]> GenerateInstitutionsImportTemplate(int operatorId)
    {
        using (var package = new ExcelPackage())
        {
            var sheet = package.Workbook.Worksheets.Add("Institution Import");
            
            sheet.Cells[1, 1].Value = "EducationalId";
            sheet.Cells[1, 2].Value = "Name";
            sheet.Cells[1, 3].Value = "ZipCode";
            sheet.Cells[1, 4].Value = "Town";
            sheet.Cells[1, 5].Value = "Street";
            sheet.Cells[1, 6].Value = "Number";
            sheet.Cells[1, 7].Value = "Floor";
            sheet.Cells[1, 8].Value = "Door";
            
            using (var range = sheet.Cells[1, 1, 1, 8])
            {
                range.Style.Font.Bold = true;
                range.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
                range.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGray);
            }
            
            sheet.Cells.AutoFitColumns();
            
            var fileBytes = package.GetAsByteArray();
            
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = "Template_Institutions.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.DownloadTemplate,
                Category = FileCategory.Institution,
                OperatorId = operatorId,
                IsSuccessful = true,
                ProcessingNotes = "Template generated"
            });

            return fileBytes;
        }
    }

    public async Task<byte[]> GenerateProfessionsImportTemplate(int operatorId)
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
            
            var fileBytes = package.GetAsByteArray();
            
            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = "Template_Professions.xlsx",
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.DownloadTemplate,
                Category = FileCategory.Profession,
                OperatorId = operatorId,
                IsSuccessful = true,
                ProcessingNotes = "Template generated"
            });

            return fileBytes;
        }
    }
}