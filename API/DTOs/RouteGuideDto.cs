using API.Entities;
using NetTopologySuite.Geometries;

namespace API.DTOs;

public class RouteGuideDto
{
    public int StepIndex { get; set; }
    public Point Location { get; set; } = null!;
    public string Instruction { get; set; } = string.Empty;
    public TravelMode TravelMode { get; set; } = TravelMode.Walking;
    public bool IsTransition { get; set; }
    public int? ParkingAreaId { get; set; }
}