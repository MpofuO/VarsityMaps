using NetTopologySuite.Geometries;

namespace API.Entities;

public class Campus
{
    public int CampusId { get; set; }
    public required string Name { get; set; }
    public required string Alias { get; set; }
    public required Point Center { get; set; }

    public int UniversityId { get; set; }
    public University University { get; set; } = null!;
    
    public ICollection<Building> Buildings { get; set; } = [];
    public ICollection<Node> Nodes { get; set; } = [];
    public ICollection<ParkingArea> ParkingAreas { get; set; } = [];
    public ICollection<Invitation> Invitations { get; set; } = [];
}
