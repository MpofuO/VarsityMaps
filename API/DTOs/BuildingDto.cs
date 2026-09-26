using System;
using NetTopologySuite.Geometries;

namespace API.DTOs;

public class BuildingDto
{
    public int BuildingId { get; set; }
    public required string Name { get; set; }
    public required string Alias { get; set; }
    public bool IsAccessible { get; set; }
    public bool IsGuestAccessible { get; set; }
    public bool AllowsPassage { get; set; }
    public required Polygon Boundary { get; set; }
}
