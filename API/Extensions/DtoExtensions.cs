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
            DateCreated = application.DateCreated,
            IsApproved = application.IsApproved.HasValue ? application.IsApproved.Value : null,
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
            Duration = invitation.Duration,
            DateCreated = invitation.DateCreated.ToString(),
            IsExpired = invitation.DateCreated.AddDays(invitation.Duration) < DateTime.UtcNow,
            IsLocked = invitation.FailedPassAttempts >= 3,
            IsRevoked = invitation.IsRevoked,
            IsRejected = invitation.IsRejected,
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

    public static NodeDto ToDto(this Node node)
    {
        return new NodeDto
        {
            NodeId = node.NodeId,
            Name = node.Name!,
            Location = node.Location,
            BuildingId = node.BuildingId
        };
    }

    public static UniversityDto ToDto(this University university)
    {
        return new UniversityDto
        {
            UniversityId = university.UniversityId,
            Name = university.Name,
            Alias = university.Alias,
            CampusCount = university.Campuses?.Count() ?? 0
        };
    }

    public static EdgeDto ToDto(this Edge edge)
    {
        return new EdgeDto
        {
            EdgeId = edge.EdgeId,
            FromNodeId = edge.FromNodeId,
            ToNodeId = edge.ToNodeId,
            Weight = edge.Weight,
            Name = edge.Name
        };
    }
}
