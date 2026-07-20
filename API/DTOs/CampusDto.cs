using NetTopologySuite.Geometries;

namespace API.DTOs;

public class CampusDto
{
    public string Name { get; set; } = string.Empty;
    public string Alias { get; set; } = string.Empty;
    public Point Center { get; set; } = null!;
}
