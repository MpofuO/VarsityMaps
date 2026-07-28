using NetTopologySuite.Geometries;

namespace API.DTOs;

public class CampusDto
{
    public int CampusId { get; set; }
    public required string Name { get; set; }
    public required string Alias { get; set; }
    public required Point Center { get; set; }
    public int UniversityId { get; set; }
}
