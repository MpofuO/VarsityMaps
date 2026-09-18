using API.Entities;

namespace API.DTOs;

public class EdgePropertiesDto
{
    public string? Name { get; set; }
    public bool IsClosed { get; set; }
    public DateTime? ClosedUntil { get; set; }
    public TravelMode TravelModes { get; set; }
}