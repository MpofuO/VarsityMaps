using NetTopologySuite.Geometries;

namespace API.DTOs;

public class ParkingAreaDto
{
    public int ParkingAreaId { get; set; }
    public required string Name { get; set; }
    public bool IsAccessible { get; set; }
    public bool IsGuestAccessible { get; set; }
    public required Polygon Boundary { get; set; }
    public IReadOnlyList<int> AccessNodeIds { get; set; } = [];
}