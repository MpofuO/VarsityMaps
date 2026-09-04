namespace API.DTOs;

public class InvitationDto
{
    public int InvitationId { get; set; }
    public string InviteeEmail { get; set; } = string.Empty;
    public string InviteeName { get; set; } = string.Empty;
    public bool IsAccepted { get; set; }
    public bool IsRevoked { get; set; }
    public bool IsExpired { get; set; }
    public bool IsLocked { get; set; }
    public bool IsRejected { get; set; }
    public int Duration { get; set; }
    public string DateCreated { get; set; } = "";
    public int CampusId { get; set; }
    public string CampusName { get; set; } = string.Empty;
    public string UniversityName { get; set; } = string.Empty;
}
