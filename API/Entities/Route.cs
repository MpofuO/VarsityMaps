using NetTopologySuite.Geometries;

namespace API.Entities;

public class Route
{
    public int RouteId { get; set; }
    public LineString Path { get; set; } = null!;
    public int FromNodeId { get; set; }
    public int ToNodeId { get; set; }
    public decimal Weight { get; set; }
    public int SearchCount { get; set; }
    public DateTime LastRetrieved { get; set; } = DateTime.UtcNow;
    
    public ICollection<Checkpoint> Checkpoints { get; set; } = [];
}
