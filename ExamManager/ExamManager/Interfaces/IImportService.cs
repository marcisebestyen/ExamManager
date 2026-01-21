using ExamManager.Responses;

namespace ExamManager.Interfaces;

public interface IImportService
{
    Task<BaseServiceResponse<ImportResult>> ImportExamsFromExcelAsync(Stream filestream, int operatorId);
    byte[] GenerateExamsImportTemplate();
    Task<BaseServiceResponse<ImportResult>> ImportExaminersFromExcelAsync(Stream filestream);
    byte[] GenerateExaminersImportTemplate();
    Task<BaseServiceResponse<ImportResult>> ImportExamTypesFromExcelAsync(Stream filestream);
    byte[] GenerateExamTypesImportTemplate();
    Task<BaseServiceResponse<ImportResult>> ImportInstitutionsFromExcelAsync(Stream filestream);
    byte[] GenerateInstitutionsImportTemplate();
    Task<BaseServiceResponse<ImportResult>> ImportProfessionsFromExcelAsync(Stream filestream);
    byte[] GenerateProfessionsImportTemplate();
}