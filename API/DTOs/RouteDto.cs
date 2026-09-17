using NetTopologySuite.Geometries;

namespace API.DTOs;

public class RouteDto
{
    public int RouteId { get; set; }
    public LineString Path { get; set; } = null!;
    public decimal DistanceMeters { get; set; }
    public int EstimatedWalkingTimeMinutes { get; set; }
    public int FromBuildingId { get; set; }
    public int ToBuildingId { get; set; }
}