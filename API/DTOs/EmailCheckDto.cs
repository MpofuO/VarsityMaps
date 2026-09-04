using System;

namespace API.DTOs;

public class EmailCheckDto
{
    public bool Exists { get; set; }
    public int? PendingInvitationId { get; set; }
}
