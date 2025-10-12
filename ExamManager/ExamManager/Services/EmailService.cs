using System.Net;
using System.Net.Mail;
using ExamManager.Configurations;
using ExamManager.Interfaces;
using Microsoft.Extensions.Options;

namespace ExamManager.Services;

public class EmailService : IEmailService
{
    private readonly MailSettings _mailSettings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<MailSettings> mailSettings, ILogger<EmailService> logger)
    {
        _mailSettings = mailSettings.Value ?? throw new ArgumentNullException(nameof(mailSettings));
        _logger = logger;
    }

    public async Task SendEmailWithAttachmentAsync(string toEmail, string subject, string body, byte[] attachmentBytes,
        string attachmentFileName)
    {
        try
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            using (var client = new SmtpClient(_mailSettings.Host, _mailSettings.Port))
            {
                client.Credentials = new NetworkCredential(_mailSettings.Username, _mailSettings.Password);
                client.EnableSsl = true;
                client.DeliveryMethod = SmtpDeliveryMethod.Network;
                client.UseDefaultCredentials = false;

                using (var mailMessage = new MailMessage())
                {
                    mailMessage.From = new MailAddress(_mailSettings.FromEmail, _mailSettings.FromName);
                    mailMessage.To.Add(toEmail);
                    mailMessage.Subject = subject;
                    mailMessage.Body = body;
                    mailMessage.IsBodyHtml = true;

                    if (attachmentBytes != null && attachmentBytes.Length > 0)
                    {
                        var attachment = new Attachment(new System.IO.MemoryStream(attachmentBytes), attachmentFileName,
                            "application/pdf");
                        mailMessage.Attachments.Add(attachment);
                    }

                    await client.SendMailAsync(mailMessage);
                }
            }

            _logger.LogInformation("Email sent to: {ToEmail} via Mailtrap. Subject: {Subject}", toEmail, subject);
        }
        catch (SmtpException ex)
        {
            _logger.LogError(ex, "Error sending email to {ToEmail}: {Message}", toEmail, ex.Message);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "General error sending email to {ToEmail}: {Message}", toEmail, ex.Message);
            throw;
        }
    }

    public async Task SendEmailAsync(string toEmail, string subject, string body)
    {
        try
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            using (var client = new SmtpClient(_mailSettings.Host, _mailSettings.Port))
            {
                client.Credentials = new NetworkCredential(_mailSettings.Username, _mailSettings.Password);
                client.EnableSsl = true;
                client.DeliveryMethod = SmtpDeliveryMethod.Network;
                client.UseDefaultCredentials = false;

                using (var mailMessage = new MailMessage())
                {
                    mailMessage.From = new MailAddress(_mailSettings.FromEmail, _mailSettings.FromName);
                    mailMessage.To.Add(toEmail);
                    mailMessage.Subject = subject;
                    mailMessage.Body = body;
                    mailMessage.IsBodyHtml = true;


                    await client.SendMailAsync(mailMessage);
                }
            }

            _logger.LogInformation("Email sent to: {ToEmail} via Mailtrap. Subject: {Subject}", toEmail, subject);
        }
        catch (SmtpException ex)
        {
            _logger.LogError(ex, "Error sending email to {ToEmail}: {Message}", toEmail, ex.Message);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "General error sending email to {ToEmail}: {Message}", toEmail, ex.Message);
            throw;
        }
    }
}