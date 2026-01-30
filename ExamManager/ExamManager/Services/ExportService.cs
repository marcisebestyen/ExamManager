using OfficeOpenXml;
using OfficeOpenXml.Style;
using ExamManager.Interfaces;
using ExamManager.Responses;
using System.Drawing;
using ExamManager.Dtos.FileHistoryDtos;
using ExamManager.Models;

namespace ExamManager.Services;

public class ExportService : IExportService
{
    private readonly IExaminerService _examinerService;
    private readonly IProfessionService _professionService;
    private readonly IInstitutionService _institutionService;
    private readonly IExamTypeService _examTypeService;
    private readonly IExamService _examService;
    private readonly IFileHistoryService _fileHistoryService;
    private readonly ILogger<ExportService> _logger;

    public ExportService(
        IExaminerService examinerService,
        IProfessionService professionService,
        IInstitutionService institutionService,
        IExamTypeService examTypeService,
        IExamService examService,
        IFileHistoryService fileHistoryService,
        ILogger<ExportService> logger)
    {
        _examinerService = examinerService ?? throw new ArgumentNullException(nameof(examinerService));
        _professionService = professionService ?? throw new ArgumentNullException(nameof(professionService));
        _institutionService = institutionService ?? throw new ArgumentNullException(nameof(institutionService));
        _examTypeService = examTypeService ?? throw new ArgumentNullException(nameof(examTypeService));
        _examService = examService ?? throw new ArgumentNullException(nameof(examService));
        _fileHistoryService = fileHistoryService ?? throw new ArgumentNullException(nameof(fileHistoryService));
        _logger = logger;

        ExcelPackage.License.SetNonCommercialPersonal("Sebestyén Marcell Achilles - Exam Manager");    
    }

    private void StyleHeader(ExcelWorksheet worksheet, int colCount)
    {
        using (var range = worksheet.Cells[1, 1, 1, colCount])
        {
            range.Style.Font.Bold = true;
            range.Style.Fill.PatternType = ExcelFillStyle.Solid;
            range.Style.Fill.BackgroundColor.SetColor(Color.LightGray);
            range.Style.Border.Bottom.Style = ExcelBorderStyle.Thick;
        }
    }

    public async Task<BaseServiceResponse<byte[]>> ExportExaminersToExcelAsync(List<int>? filteredIds, int operatorId)
    {
        try
        {
            var response = await _examinerService.GetAllExaminersAsync();
            if (!response.Succeeded)
            {
                return BaseServiceResponse<byte[]>.Failed(
                    response.Errors.FirstOrDefault() ?? "Failed to retrieve examiners.", response.ErrorCode);
            }
            
            var dataToExport = response.Data;
            if (filteredIds != null && filteredIds.Any())
            {
                dataToExport = dataToExport.Where(em => filteredIds.Contains(em.Id)).ToList();
            }

            using var package = new ExcelPackage();
            var ws = package.Workbook.Worksheets.Add("Examiners");

            ws.Cells[1, 1].Value = "ID";
            ws.Cells[1, 2].Value = "First Name";
            ws.Cells[1, 3].Value = "Last Name";
            ws.Cells[1, 4].Value = "Date of Birth";
            ws.Cells[1, 5].Value = "Email";
            ws.Cells[1, 6].Value = "Phone Number";
            ws.Cells[1, 7].Value = "ID Card Number";
            ws.Cells[1, 8].Value = "Status";
            StyleHeader(ws, 8);

            var row = 2;
            foreach (var dto in dataToExport)
            {
                ws.Cells[row, 1].Value = dto.Id;
                ws.Cells[row, 2].Value = dto.FirstName;
                ws.Cells[row, 3].Value = dto.LastName;
                ws.Cells[row, 4].Value = dto.DateOfBirth;
                ws.Cells[row, 4].Style.Numberformat.Format = "yyyy-mm-dd";
                ws.Cells[row, 5].Value = dto.Email;
                ws.Cells[row, 6].Value = dto.Phone;
                ws.Cells[row, 7].Value = dto.IdentityCardNumber;

                ws.Cells[row, 8].Value = dto.IsDeleted ? "Deleted" : "Active";
                if (dto.IsDeleted) ws.Cells[row, 1, row, 8].Style.Font.Color.SetColor(Color.Red);

                row++;
            }

            ws.Cells.AutoFitColumns();
            
            var fileBytes = package.GetAsByteArray();
            var fileName = $"Examiners_Export_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx";

            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = fileName,
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Export,
                Category = FileCategory.Examiner,
                OperatorId = operatorId,
                IsSuccessful = true,
                ProcessingNotes = $"Exported {dataToExport.Count()} rows."
            });
            
            return BaseServiceResponse<byte[]>.Success(fileBytes, "Export successful.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while exporting examiners.");
            return BaseServiceResponse<byte[]>.Failed($"An unexpected error occurred: {ex.Message}",
                "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<byte[]>> ExportProfessionsToExcelAsync(List<int>? filteredIds, int operatorId)
    {
        try
        {
            var response = await _professionService.GetAllProfessionsAsync();
            if (!response.Succeeded)
            {
                return BaseServiceResponse<byte[]>.Failed(
                    response.Errors.FirstOrDefault() ?? "Failed to retrieve professions.", response.ErrorCode);
            }
            
            var dataToExport = response.Data;
            if (filteredIds != null && filteredIds.Any())
            {
                dataToExport = dataToExport.Where(p => filteredIds.Contains(p.Id)).ToList();
            }

            using var package = new ExcelPackage();
            var ws = package.Workbook.Worksheets.Add("Professions");

            ws.Cells[1, 1].Value = "ID";
            ws.Cells[1, 2].Value = "KEOR ID";
            ws.Cells[1, 3].Value = "Profession Name";
            StyleHeader(ws, 3);

            var row = 2;
            foreach (var dto in dataToExport)
            {
                ws.Cells[row, 1].Value = dto.Id;
                ws.Cells[row, 2].Value = dto.KeorId;
                ws.Cells[row, 3].Value = dto.ProfessionName;
                row++;
            }
            
            var fileBytes = package.GetAsByteArray();
            var fileName = $"Professions_Export_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx";

            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = fileName,
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Export,
                Category = FileCategory.Profession,
                OperatorId = operatorId,
                IsSuccessful = true,
                ProcessingNotes = $"Exported {dataToExport.Count()} rows."
            });

            ws.Cells.AutoFitColumns();
            return BaseServiceResponse<byte[]>.Success(fileBytes, "Export successful.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while exporting professions.");
            return BaseServiceResponse<byte[]>.Failed($"An unexpected error occurred: {ex.Message}",
                "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<byte[]>> ExportInstitutionsToExcelAsync(List<int>? filteredIds, int operatorId)
    {
        try
        {
            var response = await _institutionService.GetAllInstitutionsAsync();
            if (!response.Succeeded)
            {
                return BaseServiceResponse<byte[]>.Failed(
                    response.Errors.FirstOrDefault() ?? "Failed to retrieve institutions.", response.ErrorCode);
            }
            
            var dataToExport = response.Data;
            if (filteredIds != null && filteredIds.Any())
            {
                dataToExport = dataToExport.Where(i => filteredIds.Contains(i.Id));
            }

            using var package = new ExcelPackage();
            var ws = package.Workbook.Worksheets.Add("Institutions");

            ws.Cells[1, 1].Value = "ID";
            ws.Cells[1, 2].Value = "Educational ID";
            ws.Cells[1, 3].Value = "Institution Name";
            ws.Cells[1, 4].Value = "Zip Code";
            ws.Cells[1, 5].Value = "Town";
            ws.Cells[1, 6].Value = "Address Details";
            StyleHeader(ws, 6);

            var row = 2;
            foreach (var dto in dataToExport)
            {
                ws.Cells[row, 1].Value = dto.Id;
                ws.Cells[row, 2].Value = dto.EducationalId;
                ws.Cells[row, 3].Value = dto.Name;
                ws.Cells[row, 4].Value = dto.ZipCode;
                ws.Cells[row, 5].Value = dto.Town;

                var addressParts = new List<string> { dto.Street, dto.Number };
                if (!string.IsNullOrWhiteSpace(dto.Floor)) addressParts.Add($"{dto.Floor}. Floor");
                if (!string.IsNullOrWhiteSpace(dto.Door)) addressParts.Add($"{dto.Door}. Door");

                ws.Cells[row, 6].Value = string.Join(" ", addressParts);
                row++;
            }

            ws.Cells.AutoFitColumns();
            
            var fileBytes = package.GetAsByteArray();
            var fileName = $"Institutions_Export_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx";

            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = fileName,
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Export,
                Category = FileCategory.Institution,
                OperatorId = operatorId,
                IsSuccessful = true,
                ProcessingNotes = $"Exported {dataToExport.Count()} rows."
            });
            
            return BaseServiceResponse<byte[]>.Success(fileBytes, "Export successful.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while exporting institutions.");
            return BaseServiceResponse<byte[]>.Failed($"An unexpected error occurred: {ex.Message}",
                "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<byte[]>> ExportExamTypesToExcelAsync(List<int>? filteredIds, int operatorId)
    {
        try
        {
            var response = await _examTypeService.GetAllExamTypesAsync();
            if (!response.Succeeded)
            {
                return BaseServiceResponse<byte[]>.Failed(
                    response.Errors.FirstOrDefault() ?? "Failed to retrieve exam types.", response.ErrorCode);
            }

            var dataToExport = response.Data;
            if (filteredIds != null && filteredIds.Any())
            {
                dataToExport = dataToExport.Where(et => filteredIds.Contains(et.Id)).ToList();
            }

            using var package = new ExcelPackage();
            var ws = package.Workbook.Worksheets.Add("ExamTypes");

            ws.Cells[1, 1].Value = "ID";
            ws.Cells[1, 2].Value = "Type Name";
            ws.Cells[1, 3].Value = "Description";
            StyleHeader(ws, 3);

            var row = 2;
            foreach (var dto in dataToExport)
            {
                ws.Cells[row, 1].Value = dto.Id;
                ws.Cells[row, 2].Value = dto.TypeName;
                ws.Cells[row, 3].Value = string.IsNullOrWhiteSpace(dto.Description) ? "-" : dto.Description;
                row++;
            }

            ws.Cells.AutoFitColumns();
            
            var fileBytes = package.GetAsByteArray();
            var fileName = $"ExamTypes_Export_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx";

            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = fileName,
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Export,
                Category = FileCategory.ExamType,
                OperatorId = operatorId,
                IsSuccessful = true,
                ProcessingNotes = $"Exported {dataToExport.Count()} rows."
            });
            
            return BaseServiceResponse<byte[]>.Success(fileBytes, "Export successful.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while exporting exam types.");
            return BaseServiceResponse<byte[]>.Failed($"An unexpected error occurred: {ex.Message}",
                "UNEXPECTED_ERROR");
        }
    }

    public async Task<BaseServiceResponse<byte[]>> ExportExamsToExcelAsync(List<int>? filteredIds, int operatorId)
    {
        try
        {
            var response = await _examService.GetAllExamsAsync();
            if (!response.Succeeded)
            {
                return BaseServiceResponse<byte[]>.Failed(
                    response.Errors.FirstOrDefault() ?? "Failed to retrieve exams.", response.ErrorCode);
            }
            
            var dataToExport = response.Data;
            if (filteredIds != null && filteredIds.Any())
            {
                dataToExport = dataToExport.Where(e => filteredIds.Contains(e.Id)).ToList();
            }

            using var package = new ExcelPackage();
            var ws = package.Workbook.Worksheets.Add("Exams");

            ws.Cells[1, 1].Value = "ID";
            ws.Cells[1, 2].Value = "Exam Code";
            ws.Cells[1, 3].Value = "Exam Name";
            ws.Cells[1, 4].Value = "Date";
            ws.Cells[1, 5].Value = "Status";
            ws.Cells[1, 6].Value = "Exam Type";
            ws.Cells[1, 7].Value = "Profession";
            ws.Cells[1, 8].Value = "Institution";
            ws.Cells[1, 9].Value = "Created By";
            ws.Cells[1, 10].Value = "Board Members";
            ws.Cells[1, 11].Value = "Deleted?";
            ws.Cells[1, 12].Value = "Deleted By";
            StyleHeader(ws, 12);

            var row = 2;
            foreach (var dto in dataToExport)
            {
                ws.Cells[row, 1].Value = dto.Id;
                ws.Cells[row, 2].Value = dto.ExamCode;
                ws.Cells[row, 3].Value = dto.ExamName;
                ws.Cells[row, 4].Value = dto.ExamDate;
                ws.Cells[row, 4].Style.Numberformat.Format = "yyyy-mm-dd HH:mm";
                ws.Cells[row, 5].Value = dto.Status.ToString();
                ws.Cells[row, 6].Value = dto.ExamTypeName;
                ws.Cells[row, 7].Value = $"{dto.ProfessionKeorId} - {dto.ProfessionName}";
                ws.Cells[row, 8].Value = dto.InstitutionName;
                ws.Cells[row, 9].Value = dto.OperatorUserName;

                if (dto.ExamBoards != null && dto.ExamBoards.Any())
                {
                    var boardMembers =
                        dto.ExamBoards.Select(b => $"{b.ExaminerLastName} {b.ExaminerFirstName} ({b.Role})");
                    ws.Cells[row, 10].Value = string.Join(", ", boardMembers);
                }
                else
                {
                    ws.Cells[row, 10].Value = "No Board Assigned";
                }

                if (dto.IsDeleted)
                {
                    ws.Cells[row, 11].Value = "Yes";
                    ws.Cells[row, 12].Value = dto.DeletedByOperatorName;
                    ws.Cells[row, 1, row, 12].Style.Font.Color.SetColor(Color.Red);
                }
                else
                {
                    ws.Cells[row, 11].Value = "No";
                    ws.Cells[row, 12].Value = "-";
                }

                row++;
            }

            ws.Cells.AutoFitColumns();
            
            var fileBytes = package.GetAsByteArray();
            var fileName = $"Exams_Export_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx";

            await _fileHistoryService.CreateFileHistoryAsync(new FileHistoryCreateDto
            {
                FileName = fileName,
                ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileContent = fileBytes,
                Action = FileAction.Export,
                Category = FileCategory.Exam,
                OperatorId = operatorId,
                IsSuccessful = true,
                ProcessingNotes = $"Exported {dataToExport.Count()} rows."
            });
            
            return BaseServiceResponse<byte[]>.Success(fileBytes, "Export successful.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while exporting exams.");
            return BaseServiceResponse<byte[]>.Failed($"An unexpected error occurred: {ex.Message}",
                "UNEXPECTED_ERROR");
        }
    }
}