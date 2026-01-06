using ExamManager.Responses;

namespace ExamManager.Interfaces;

public interface IExportService
{
    Task<BaseServiceResponse<byte[]>> ExportExaminersToExcelAsync();
    Task<BaseServiceResponse<byte[]>> ExportProfessionsToExcelAsync();
    Task<BaseServiceResponse<byte[]>> ExportInstitutionsToExcelAsync();
    Task<BaseServiceResponse<byte[]>> ExportExamTypesToExcelAsync();
    Task<BaseServiceResponse<byte[]>> ExportExamsToExcelAsync();
}