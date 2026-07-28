namespace API.Entities;

public class Invitation
{
    public int InvitationId { get; set; }
    public string InviteeEmail { get; set; } = string.Empty;
    public string InviteeName { get; set; } = string.Empty;
    public byte[] PasswordHash { get; set; } =null!;
    public byte[] PasswordSalt { get; set; } = null!;
    public DateTime DateCreated { get; set; }
    public int Duration { get; set; }
    public bool IsRevoked { get; set; }
    public bool IsAccepted { get; set; }
    public int FailedPassAttempts { get; set; }
    
    public int CampusId { get; set; }
    public Campus Campus { get; set; } = null!;
}
