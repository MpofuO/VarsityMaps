using API.DTOs;
using API.Entities;
using Route = API.Entities.Route;

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
            AllowsPassage = building.AllowsPassage,
            Boundary = building.Boundary
        };
    }

    public static ParkingAreaDto ToDto(this ParkingArea parkingArea)
    {
        return new ParkingAreaDto
        {
            ParkingAreaId = parkingArea.ParkingAreaId,
            Name = parkingArea.Name,
            IsAccessible = parkingArea.IsAccessible,
            IsGuestAccessible = parkingArea.IsGuestAccessible,
            Boundary = parkingArea.Boundary,
            AccessNodeIds = parkingArea.AccessNodes.Select(n => n.NodeId).ToList()
        };
    }

    public static NodeDto ToDto(this Node node)
    {
        return new NodeDto
        {
            NodeId = node.NodeId,
            Name = node.Name!,
            Location = node.Location,
            BuildingId = node.BuildingId,
            ParkingAreaId = node.ParkingAreaId
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
            Name = edge.Name,
            IsClosed = edge.IsClosed,
            ClosedUntil = edge.ClosedUntil,
            IsEffectivelyClosed = edge.IsClosed && (edge.ClosedUntil == null || edge.ClosedUntil > DateTime.UtcNow),
            TravelModes = edge.TravelModes
        };
    }

    public static RouteDto ToDto(this Route route)
    {
        const double averageWalkingSpeedMetersPerSecond = 1.4;
        const double averageCyclingSpeedMetersPerSecond = 4.5;
        const double averageDrivingSpeedMetersPerSecond = 7;

        double speedMetersPerSecond = route.TravelMode switch
        {
            TravelMode.Walking => averageWalkingSpeedMetersPerSecond,
            TravelMode.Cycling => averageCyclingSpeedMetersPerSecond,
            _ => averageDrivingSpeedMetersPerSecond
        };

        var estimatedMinutes = (double)route.Weight / speedMetersPerSecond / 60.0;


        return new RouteDto
        {
            RouteId = route.RouteId,
            Path = route.Path,
            DistanceMeters = route.Weight,
            EstimatedTravelTimeMinutes = Math.Max(1, (int)Math.Round(estimatedMinutes)),
            FromBuildingId = route.FromBuildingId,
            ToBuildingId = route.ToBuildingId,
            TravelMode = route.TravelMode,
            TransitionParkingAreaId = route.TransitionParkingAreaId,
            TransitionLocation = route.TransitionLocation,
            OriginParkingAreaId = route.OriginParkingAreaId,
            OriginParkingLocation = route.OriginParkingLocation
        };
    }

    public static RouteGuideDto ToDto(this RouteGuide guide)
    {
        return new RouteGuideDto
        {
            StepIndex = guide.StepIndex,
            Location = guide.Location,
            Instruction = guide.Instruction,
            TravelMode = guide.TravelMode,
            IsTransition = guide.IsTransition,
            ParkingAreaId = guide.ParkingAreaId
        };
    }
}
