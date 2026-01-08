using ExamManager.Responses;

namespace ExamManager.Interfaces;

public interface IExportService
{
    Task<BaseServiceResponse<byte[]>> ExportExaminersToExcelAsync(List<int>? filteredIds = null);
    Task<BaseServiceResponse<byte[]>> ExportProfessionsToExcelAsync(List<int>? filteredIds = null);
    Task<BaseServiceResponse<byte[]>> ExportInstitutionsToExcelAsync(List<int>? filteredIds = null);
    Task<BaseServiceResponse<byte[]>> ExportExamTypesToExcelAsync(List<int>? filteredIds = null);
    Task<BaseServiceResponse<byte[]>> ExportExamsToExcelAsync(List<int>? filteredIds = null);
}