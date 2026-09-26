using NetTopologySuite.Geometries;

namespace API.DTOs;

public class LiveRouteDto
{
    public RouteDto Route { get; set; } = null!;
    public IReadOnlyList<RouteGuideDto> RouteGuides { get; set; } = [];
    public Point? OriginSnapLocation { get; set; }
}