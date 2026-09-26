using API.Entities;
using NetTopologySuite.Geometries;

namespace API.DTOs;

public class RouteDto
{
    public int RouteId { get; set; }
    public LineString Path { get; set; } = null!;
    public decimal DistanceMeters { get; set; }
    public int EstimatedTravelTimeMinutes { get; set; }
    public int FromBuildingId { get; set; }
    public int ToBuildingId { get; set; }
    public TravelMode TravelMode { get; set; }
    public int? TransitionParkingAreaId { get; set; }
    public Point? TransitionLocation { get; set; }
    public int? OriginParkingAreaId { get; set; }
    public Point? OriginParkingLocation { get; set; }
}