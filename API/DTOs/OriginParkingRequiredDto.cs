using NetTopologySuite.Geometries;

namespace API.DTOs;

public class OriginParkingRequiredDto
{
    public string Code { get; set; } = "ORIGIN_PARKING_REQUIRED";
    public string Message { get; set; } = "Select where you are parked to continue this route.";
    public IReadOnlyList<ParkingAreaOptionDto> ParkingAreas { get; set; } = [];
}

public class ParkingAreaOptionDto
{
    public int ParkingAreaId { get; set; }
    public required string Name { get; set; }
    public required Polygon Boundary { get; set; }
    public IReadOnlyList<int> AccessNodeIds { get; set; } = [];
}