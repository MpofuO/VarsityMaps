using API.Entities;
using NetTopologySuite.Geometries;

namespace API.DTOs;

public class NodeDto
{
    public string Name { get; set; } = string.Empty;
    public Point Location { get; set; } = null!;
    public int CampusId { get; set; }
    public int? BuildingId { get; set; }
}
