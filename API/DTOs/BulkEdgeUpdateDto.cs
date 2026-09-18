using API.Entities;

namespace API.DTOs;

public class BulkEdgeUpdateDto
{
    public List<int> EdgeIds { get; set; } = [];
    public bool IsClosed { get; set; }
    public DateTime? ClosedUntil { get; set; }
    public TravelMode TravelModes { get; set; }
}