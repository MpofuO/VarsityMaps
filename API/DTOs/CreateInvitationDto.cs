using System;

namespace API.DTOs;

public class CreateInvitationDto
{
    public string InviteeEmail { get; set; } = string.Empty;
    public string InviteeName { get; set; } = string.Empty;
    public int CampusId { get; set; }
    public string Password { get; set; } = string.Empty;
}
