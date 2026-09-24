using NetTopologySuite.Geometries;

namespace API.Entities;

public class ParkingArea
{
    public int ParkingAreaId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsAccessible { get; set; }
    public bool IsGuestAccessible { get; set; }
    public required Polygon Boundary { get; set; }

    public int CampusId { get; set; }
    public Campus Campus { get; set; } = null!;

    public ICollection<Node> AccessNodes { get; set; } = [];
}