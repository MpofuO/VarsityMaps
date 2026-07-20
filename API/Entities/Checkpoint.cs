using NetTopologySuite.Geometries;

namespace API.Entities;

public class Checkpoint
{
    public int Id { get; set; }
    public required Point Location { get; set; }
    public string Message { get; set; } = string.Empty;
    
    public int RouteId { get; set; }
    public Route Route {get; set;} = null!;
}
