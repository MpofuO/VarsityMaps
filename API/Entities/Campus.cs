using NetTopologySuite.Geometries;

namespace API.Entities;

public class Campus
{
    public int CampusId { get; set; }
    public string Name { get; set; } = string.Empty;
    public required Point Center { get; set; }

    public int UniversityId { get; set; }
    public University University { get; set; } = null!;
    public Invitation Invitation { get; set; } = null!;
    
    public ICollection<Building> Buildings { get; set; } = [];
    public ICollection<Node> Nodes { get; set; } = [];
}
