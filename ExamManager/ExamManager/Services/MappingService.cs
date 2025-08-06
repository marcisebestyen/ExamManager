using AutoMapper;
using ExamManager.Dtos;
using ExamManager.Dtos.BackupHistoryDtos;
using ExamManager.Dtos.ExamBoardDtos;
using ExamManager.Dtos.ExamDtos;
using ExamManager.Dtos.ExaminerDtos;
using ExamManager.Dtos.InstitutionDtos;
using ExamManager.Dtos.OperatorDtos;
using ExamManager.Dtos.PasswordResetDtos;
using ExamManager.Dtos.ProfessionDtos;
using ExamManager.Models;
using ExamManager.Responses;
using ExamManager.Responses.ExaminerResponses;
using ExamManager.Responses.ExamTypeResponses;
using ExamManager.Responses.InstitutionResponses;
using ExamManager.Responses.ProfessionResponses;

namespace ExamManager.Services;

public class MappingService : Profile
{
    public MappingService()
    {
        CreateMap<OperatorCreateDto, Operator>()
            .ForMember(dest => dest.Password,
                opt => opt.MapFrom(src => BCrypt.Net.BCrypt.HashPassword(src.Password)));
        CreateMap<OperatorUpdateDto, Operator>()
            .ForAllMembers(opt =>
                opt.Condition((src, dest, srcMember) => srcMember != null));
        CreateMap<Operator, OperatorResponseDto>()
            .ForMember(dest => dest.DeletedByOperatorName,
                opt => opt.MapFrom(src =>
                    src.DeletedBy != null ? $"{src.DeletedBy.FirstName} {src.DeletedBy.LastName}" : null));
        CreateMap<Operator, OperatorRegisterResponseDto>();
        CreateMap<Operator, OperatorLoginResponseDto>();
        CreateMap<OperatorResponseDto, OperatorUpdateDto>();

        CreateMap<ExamTypeCreateDto, ExamType>();
        CreateMap<ExamTypeUpdateDto, ExamType>()
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember != null));
        CreateMap<ExamType, ExamTypeResponseDto>();
        CreateMap<ExamType, ExamTypeCreateResponseDto>();
        CreateMap<ExamTypeResponseDto, ExamTypeUpdateDto>();

        CreateMap<ProfessionCreateDto, Profession>();
        CreateMap<ProfessionUpdateDto, Profession>()
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember != null));
        CreateMap<Profession, ProfessionResponseDto>();
        CreateMap<Profession, ProfessionCreateResponseDto>();
        CreateMap<ProfessionResponseDto, ProfessionUpdateDto>();

        CreateMap<InstitutionCreateDto, Institution>();
        CreateMap<InstitutionUpdateDto, Institution>()
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember != null));
        CreateMap<Institution, InstitutionResponseDto>();
        CreateMap<Institution, InstitutionCreateResponseDto>();
        CreateMap<InstitutionResponseDto, InstitutionUpdateDto>();

        CreateMap<ExaminerCreateDto, Examiner>();
        CreateMap<ExaminerUpdateDto, Examiner>()
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember != null));
        CreateMap<Examiner, ExaminerResponseDto>()
            .ForMember(dest => dest.DeletedByOperatorName,
                opt => opt.MapFrom(src =>
                    src.DeletedBy != null ? $"{src.DeletedBy.FirstName} {src.DeletedBy.LastName}" : null));
        CreateMap<Examiner, ExaminerCreateResponseDto>();
        CreateMap<ExaminerResponseDto, ExaminerUpdateDto>();

        CreateMap<ExamBoardCreateSubDto, ExamBoard>();
        CreateMap<ExamBoardUpdateSubDto, ExamBoard>()
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember != null));
        CreateMap<ExamBoard, ExamBoardResponseDto>()
            .ForMember(dest => dest.ExamName,
                opt => opt.MapFrom(src =>
                    src.Exam != null ? src.Exam.ExamName : string.Empty))
            .ForMember(dest => dest.ExamCode,
                opt => opt.MapFrom(src =>
                    src.Exam != null ? src.Exam.ExamCode : string.Empty))
            .ForMember(dest => dest.ExaminerFirstName,
                opt => opt.MapFrom(src =>
                    src.Examiner != null ? src.Examiner.FirstName : string.Empty))
            .ForMember(dest => dest.ExaminerLastName,
                opt => opt.MapFrom(src =>
                    src.Examiner != null ? src.Examiner.LastName : string.Empty))
            .ForMember(dest => dest.DeletedByOperatorName,
                opt => opt.MapFrom(src =>
                    src.DeletedBy != null ? $"{src.DeletedBy.FirstName} {src.DeletedBy.LastName}" : null));

        CreateMap<ExamCreateDto, Exam>();
        CreateMap<ExamUpdateDto, Exam>()
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember != null));
        CreateMap<Exam, ExamResponseDto>()
            .ForMember(dest => dest.ProfessionKeorId,
                opt => opt.MapFrom(src =>
                    src.Profession != null ? src.Profession.KeorId : string.Empty))
            .ForMember(dest => dest.ProfessionName,
                opt => opt.MapFrom(src =>
                    src.Profession != null ? src.Profession.ProfessionName : string.Empty))
            .ForMember(dest => dest.InstitutionName,
                opt => opt.MapFrom(src =>
                    src.Institution != null ? src.Institution.Name : string.Empty))
            .ForMember(dest => dest.ExamTypeName,
                opt => opt.MapFrom(src =>
                    src.ExamType != null ? src.ExamType.TypeName : string.Empty))
            .ForMember(dest => dest.OperatorUserName,
                opt => opt.MapFrom(src =>
                    src.Operator != null ? src.Operator.UserName : string.Empty))
            .ForMember(dest => dest.DeletedByOperatorName,
                opt => opt.MapFrom(src =>
                    src.DeletedBy != null ? $"{src.DeletedBy.FirstName} {src.DeletedBy.LastName}" : null))
            .ForMember(dest => dest.ExamBoards,
                opt => opt.MapFrom(src =>
                    src.ExamBoard.Where(eb => !eb.IsDeleted)));

        CreateMap<BackupHistoryCreateDto, BackupHistory>();
        CreateMap<BackupHistory, BackupHistoryResponseDto>()
            .ForMember(dest => dest.OperatorUserName,
                opt => opt.MapFrom(src => src.Operator != null ? src.Operator.UserName : string.Empty));

        CreateMap<PasswordReset, PasswordResetResponseDto>()
            .ForMember(dest => dest.OperatorUserName,
                opt => opt.MapFrom(src => src.Operator != null ? src.Operator.UserName : string.Empty));
    }
}