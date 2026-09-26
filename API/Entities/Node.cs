using NetTopologySuite.Geometries;

namespace API.Entities;

public class Node
{
    public int NodeId { get; set; }
    public string? Name { get; set; }
    public string? InterestOfEntrance { get; set; }
    public required Point Location { get; set; }

    public int CampusId { get; set; }
    public Campus Campus { get; set; } = null!;
    public int? BuildingId { get; set; }
    public Building? Building { get; set; }
    public int? ParkingAreaId { get; set; }
    public ParkingArea? ParkingArea { get; set; }

    public ICollection<Edge> OutgoingEdges { get; set; } = [];
    public ICollection<Edge> IncomingEdges { get; set; } = [];
}
