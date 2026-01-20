using AutoMapper;
using ExamManager.Dtos;
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
}