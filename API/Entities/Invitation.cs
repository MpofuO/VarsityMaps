namespace API.Entities;

public class Invitation
{
    public string InvitationId { get; set; } = string.Empty;
    public string InviteeEmail { get; set; } = string.Empty;
    public string InviteeName { get; set; } = string.Empty;
    public string RedirectUrl { get; set; } = string.Empty;
    public byte[] PasswordHash { get; set; } =null!;
    public byte[] PasswordSalt { get; set; } = null!;
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public bool IsAccepted { get; set; }
    
    public int CampusId { get; set; }
}
