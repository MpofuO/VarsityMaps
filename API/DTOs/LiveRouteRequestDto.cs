using API.Entities;
using NetTopologySuite.Geometries;

namespace API.DTOs;

public class LiveRouteRequestDto
{
    public Point? Location { get; set; }
    public int ToBuildingId { get; set; }
    public TravelMode Mode { get; set; } = TravelMode.Walking;
    public string? DestinationInterest { get; set; }
    public bool IncludeAllDestinationEntrances { get; set; }
    public bool? IsWalkingLeg { get; set; }
    public int? DestinationParkingAreaId { get; set; }
}