using API.Entities;

namespace API.DTOs;

public class EdgeDto
{
    public int EdgeId { get; set; }
    public int FromNodeId { get; set; }
    public int ToNodeId { get; set; }
    public decimal Weight { get; set; }
    public string? Name { get; set; }
    public bool IsClosed { get; set; }
    public DateTime? ClosedUntil { get; set; }
    public bool IsEffectivelyClosed { get; set; }
    public TravelMode TravelModes { get; set; }
}