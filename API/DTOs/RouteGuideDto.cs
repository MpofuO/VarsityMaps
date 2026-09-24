using NetTopologySuite.Geometries;

namespace API.DTOs;

public class RouteGuideDto
{
    public int StepIndex { get; set; }
    public Point Location { get; set; } = null!;
    public string Instruction { get; set; } = string.Empty;
}