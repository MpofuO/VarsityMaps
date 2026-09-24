using NetTopologySuite.Geometries;

namespace API.Entities;

public class RouteGuide
{
    public int RouteGuideId { get; set; }
    public int StepIndex { get; set; }
    public required Point Location { get; set; }
    public string Instruction { get; set; } = string.Empty;

    public int RouteId { get; set; }
    public Route Route { get; set; } = null!;
}