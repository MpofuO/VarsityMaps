using System;
using API.DTOs;
using API.Entities;

namespace API.Extensions;

public static class DtoExtensions
{
    public static ApplicationDto ToDto(this Application application)
    {
        return new ApplicationDto
        {
            ApplicationId = application.ApplicationId,
            UniversityName = application.UniversityName,
            UniversityAlias = application.UniversityAlias,
            CampusCount = application.CampusCount,
            DateCreated = application.DateCreated,
            IsApproved = application.IsApproved,
            DecisionReason = application.DecisionReason
        };
    }

    public static InvitationDto ToDto(this Invitation invitation)
    {
        return new InvitationDto
        {
            InvitationId = invitation.InvitationId,
            InviteeEmail = invitation.InviteeEmail,
            InviteeName = invitation.InviteeName,
            IsExpired = invitation.DateCreated.AddDays(invitation.Duration) < DateTime.UtcNow,
            IsLocked = invitation.FailedPassAttempts >= 3,
            CampusId = invitation.CampusId,
            CampusName = invitation.Campus?.Name ?? string.Empty,
            UniversityName = invitation.Campus?.University?.Name ?? string.Empty
        };
    }

    public static CampusDto ToDto(this Campus campus)
    {
        return new CampusDto
        {
            CampusId = campus.CampusId,
            Name = campus.Name,
            Alias = campus.Alias,
            Center = campus.Center,
            UniversityId = campus.UniversityId
        };
    }

    public static BuildingDto ToDto(this Building building)
    {
        return new BuildingDto
        {
            BuildingId = building.BuildingId,
            Name = building.Name,
            Alias = building.Alias,
            IsAccessible = building.IsAccessible,
            IsGuestAccessible = building.IsGuestAccessible,
            Boundary = building.Boundary
        };
    }
}
