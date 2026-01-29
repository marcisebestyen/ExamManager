using System.ComponentModel.DataAnnotations;
using ExamManager.Models;

namespace ExamManager.Dtos.FileHistoryDtos;

public class FileHistoryCreateDto
{
    [Required]
    public string FileName { get; set; }
    [Required]
    public byte[] FileContent { get; set; }
    [Required]
    public string ContentType { get; set; }
    public FileAction Action { get; set; }
    public FileCategory Category { get; set; }
    public int OperatorId { get; set; }
    public bool IsSuccessful { get; set; }
    public string? ProcessingNotes { get; set; }
    public int? RelatedEntityId { get; set; }
}