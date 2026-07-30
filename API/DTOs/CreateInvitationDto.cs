using System;

namespace API.DTOs;

public class CreateInvitationDto
{
    public required string InviteeEmail { get; set; }
    public required string InviteeName { get; set; }
    public required int CampusId { get; set; }
    public required int Duration { get; set; }
}
