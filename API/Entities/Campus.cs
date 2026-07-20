using NetTopologySuite.Geometries;

namespace API.Entities;

public class Campus
{
    public int CampusId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Alias { get; set; } = string.Empty;
    public required Point Center { get; set; }

    public int UniversityId { get; set; }
    public University University { get; set; } = null!;
    
    public ICollection<Building> Buildings { get; set; } = [];
    public ICollection<Node> Nodes { get; set; } = [];
    public ICollection<Edge> Edges { get; set; } = [];
}
