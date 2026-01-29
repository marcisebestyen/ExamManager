using ExamManager.Responses;

namespace ExamManager.Interfaces;

public interface IExportService
{
    Task<BaseServiceResponse<byte[]>> ExportExaminersToExcelAsync(List<int>? filteredIds, int operatorId);
    Task<BaseServiceResponse<byte[]>> ExportProfessionsToExcelAsync(List<int>? filteredIds, int operatorId);
    Task<BaseServiceResponse<byte[]>> ExportInstitutionsToExcelAsync(List<int>? filteredIds, int operatorId);
    Task<BaseServiceResponse<byte[]>> ExportExamTypesToExcelAsync(List<int>? filteredIds, int operatorId);
    Task<BaseServiceResponse<byte[]>> ExportExamsToExcelAsync(List<int>? filteredIds, int operatorId);
}