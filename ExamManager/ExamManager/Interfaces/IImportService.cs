using ExamManager.Responses;

namespace ExamManager.Interfaces;

public interface IImportService
{
    Task<BaseServiceResponse<ImportResult>> ImportExamsFromExcelAsync(Stream filestream, int operatorId);
    Task<byte[]> GenerateExamsImportTemplate(int operatorId, string languageCode = "en");
    Task<BaseServiceResponse<ImportResult>> ImportExaminersFromExcelAsync(Stream filestream, int operatorId);
    Task<byte[]> GenerateExaminersImportTemplate(int operatorId, string languageCode = "en");
    Task<BaseServiceResponse<ImportResult>> ImportExamTypesFromExcelAsync(Stream filestream, int operatorId);
    Task<byte[]> GenerateExamTypesImportTemplate(int operatorId, string languageCode = "en");
    Task<BaseServiceResponse<ImportResult>> ImportInstitutionsFromExcelAsync(Stream filestream, int operatorId);
    Task<byte[]> GenerateInstitutionsImportTemplate(int operatorId,  string languageCode = "en");
    Task<BaseServiceResponse<ImportResult>> ImportProfessionsFromExcelAsync(Stream filestream, int operatorId);
    Task<byte[]> GenerateProfessionsImportTemplate(int operatorId, string languageCode = "en");
}