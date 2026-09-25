using NetTopologySuite.Geometries;

namespace API.DTOs;

public class NodeDto
{
    public int NodeId { get; set; }
    public required string Name { get; set; }
    public required Point Location { get; set; }
    public int? BuildingId { get; set; }
    public int? ParkingAreaId { get; set; }
}
