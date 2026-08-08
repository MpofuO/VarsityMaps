using API.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace API.Services;

public class MailService(IOptions<MailSettings> mailSettings) : IMailService
{
  private readonly MailSettings _settings = mailSettings.Value;

  public Task SendInvitationPinAsync(string toEmail, string toName, string pin, int invitationId)
  {
    var acceptLink = $"{_settings.ClientUrl.TrimEnd('/')}/accept-invitation/{invitationId}";

    var bodyContent = $@"
            <p style=""margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;"">
                Hi <strong>{toName}</strong>,
            </p>
            <p style=""margin: 0 0 20px; color: #475569; font-size: 15px; line-height: 1.6;"">
                You have been invited to join <strong>VarsityMaps</strong> as a <strong>Campus Admin</strong>.
            </p>
            <p style=""margin: 0 0 12px; color: #475569; font-size: 14px;"">
                Use the security PIN below to complete your setup:
            </p>
        ";

    return SendGenericEmailAsync(
        toEmail,
        toName,
        "You've Been Invited to VarsityMaps",
        "VarsityMaps Invitation",
        bodyContent,
        highlightCode: pin,
        actionUrl: acceptLink,
        actionText: "Accept Invitation"
    );
  }

  public Task SendInvitationReminderAsync(string toEmail, string toName, int invitationId)
  {
    var acceptLink = $"{_settings.ClientUrl.TrimEnd('/')}/accept-invitation/{invitationId}";

    var bodyContent = $@"
            <p style=""margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;"">
                Hi <strong>{toName}</strong>,
            </p>
            <p style=""margin: 0 0 20px; color: #475569; font-size: 15px; line-height: 1.6;"">
                This is a friendly reminder that you have a pending <strong>Campus Admin</strong> invitation for VarsityMaps.
            </p>
            <p style=""margin: 0 0 20px; color: #64748b; font-size: 13px; line-height: 1.5;"">
                If you have lost your PIN, please request your University Admin to issue a reset.
            </p>
        ";

    return SendGenericEmailAsync(
        toEmail,
        toName,
        "Reminder: Pending VarsityMaps Invitation",
        "Invitation Reminder",
        bodyContent,
        actionUrl: acceptLink,
        actionText: "Go to Acceptance Page"
    );
  }

  public Task SendApplicationApprovedAsync(string toEmail, string universityName)
  {
    var loginLink = $"{_settings.ClientUrl.TrimEnd('/')}/login";

    var bodyContent = $@"
        <p style=""margin: 0 0 16px; color: #475569; font-size: 15px; line-height: 1.6;"">
            Congratulations!
        </p>
        <p style=""margin: 0 0 20px; color: #475569; font-size: 15px; line-height: 1.6;"">
            <strong>{universityName}</strong>'s application to join <strong>VarsityMaps</strong> has been approved.
            Your university admin account is now active.
        </p>
        <p style=""margin: 0 0 12px; color: #475569; font-size: 14px;"">
            You can sign in now to start setting up your campuses.
        </p>
    ";

    return SendGenericEmailAsync(
        toEmail,
        universityName,
        "Your Institution Has Been Approved",
        "VarsityMaps Approval",
        bodyContent,
        actionUrl: loginLink,
        actionText: "Sign In"
    );
  }

  private async Task SendGenericEmailAsync(
      string toEmail,
      string toName,
      string subject,
      string preheader,
      string bodyHtml,
      string? highlightCode = null,
      string? actionUrl = null,
      string? actionText = null)
  {
    var htmlTemplate = $@"
        <!DOCTYPE html>
        <html lang=""en"">
        <head>
          <meta charset=""utf-8"">
          <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
          <title>{subject}</title>
        </head>
        <body style=""margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;"">
          <div style=""display:none; font-size:1px; color:#f8fafc; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden;"">
            {preheader}
          </div>
          <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" border=""0"" style=""background-color:#f8fafc; padding: 32px 16px;"">
            <tr>
              <td align=""center"">
                <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" border=""0"" style=""max-width: 520px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);"">
                  
                  <!-- Header -->
                  <tr>
                    <td style=""background-color: #4f46e5; padding: 28px 32px; text-align: center;"">
                      <h1 style=""margin:0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;"">
                        Varsity<span style=""color: #a5b4fc;"">Maps</span>
                      </h1>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style=""padding: 32px;"">
                      {bodyHtml}

                      {(string.IsNullOrEmpty(highlightCode) ? "" : $@"
                      <div style=""background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;"">
                        <span style=""font-family: monospace; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #0f172a;"">{highlightCode}</span>
                        <p style=""margin: 6px 0 0; font-size: 11px; color: #64748b;"">(You have up to 3 attempts to enter this PIN)</p>
                      </div>
                      ")}

                      {(string.IsNullOrEmpty(actionUrl) ? "" : $@"
                      <div style=""text-align: center; margin-top: 28px; margin-bottom: 12px;"">
                        <a href=""{actionUrl}"" target=""_blank"" style=""background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 6px; display: inline-block; transition: all 0.2s;"">
                          {actionText ?? "Continue"} &rarr;
                        </a>
                      </div>
                      ")}
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style=""background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;"">
                      <p style=""margin:0; font-size: 12px; color: #94a3b8; line-height: 1.5;"">
                        If you were not expecting this invitation, you can safely ignore this email.<br>
                        &copy; {DateTime.UtcNow.Year} VarsityMaps. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>";

    var message = new MimeMessage();
    message.From.Add(new MailboxAddress(_settings.SenderName, _settings.SenderEmail));
    message.To.Add(new MailboxAddress(toName, toEmail));
    message.Subject = subject;

    var builder = new BodyBuilder { HtmlBody = htmlTemplate };
    message.Body = builder.ToMessageBody();

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
  public string ClientUrl { get; set; } = "";
}