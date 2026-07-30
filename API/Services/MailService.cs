using API.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace API.Services;

public class MailService(IOptions<MailSettings> mailSettings) : IMailService
{
    private readonly MailSettings _settings = mailSettings.Value;

    public Task SendInvitationPinAsync(string toEmail, string toName, string pin) =>
    SendAsync(toEmail, toName, "You've Been Invited to Varsity Maps",
        $"Hi {toName},\n\n" +
        $"You've been invited to join Varsity Maps as a Campus Admin.\n\n" +
        $"Your PIN to accept this invitation is: {pin}\n" +
        $"(Note: you have up to 3 attempts to enter it correctly.)\n\n" +
        $"Click the link below to proceed:\n" +
        $"{{invitationLink}}\n\n" +
        $"If you weren't expecting this invitation, you can safely ignore this email.");

    public Task SendInvitationReminderAsync(string toEmail, string toName) =>
        SendAsync(toEmail, toName, "Reminder: Pending Varsity Maps Invitation",
            $"Hi {toName},\n\nYou have a pending Campus Admin invitation. " +
            $"If you've lost your PIN, ask your University Admin to reset it.");

    private async Task SendAsync(string toEmail, string toName, string subject, string body)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_settings.SenderName, _settings.SenderEmail));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = body };

        using var client = new SmtpClient();
        await client.ConnectAsync(_settings.Host, _settings.Port, SecureSocketOptions.Auto);
        await client.AuthenticateAsync(_settings.Username, _settings.Password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}

public class MailSettings
{
    public string Host { get; set; } = "";
    public int Port { get; set; }
    public string SenderEmail { get; set; } = "";
    public string SenderName { get; set; } = "";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}