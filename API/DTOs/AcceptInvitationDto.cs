using System;

namespace API.DTOs;

public class AcceptInvitationDto
{
    public required string Pin { get; set; }
    public required string Password { get; set; }
}
