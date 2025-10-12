namespace ExamManager.Interfaces;

public interface IEmailService
{
    Task SendEmailWithAttachmentAsync(string toEmail, string subject, string body, byte[] attachmentBytes, string attachmentFileName);
    Task SendEmailAsync(string toEmail, string subject, string body);
}