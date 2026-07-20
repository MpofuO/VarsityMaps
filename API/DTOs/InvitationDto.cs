namespace API.DTOs;

public class InvitationDto
{
    public string InviteeEmail { get; set; } = string.Empty;
    public string InviteeName { get; set; } = string.Empty;
    public int CampusId { get; set; }
    public string RedirectUrl { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
