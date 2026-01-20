using ExamManager.Responses;

namespace ExamManager.Interfaces;

public interface IImportService
{
    Task<BaseServiceResponse<ImportResult>> ImportExamTypesFromExcelAsync(Stream filestream);
    byte[] GenerateExamTypesImportTemplate();
}