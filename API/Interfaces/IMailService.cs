using System;

namespace API.Interfaces;

public interface IMailService
{
    Task SendInvitationPinAsync(string toEmail, string toName, string pin, int invitationId);
    Task SendInvitationReminderAsync(string toEmail, string toName, int invitationId);
}
