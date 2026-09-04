namespace API.Entities;

public class Edge
{
    public int EdgeId { get; set; }
    public decimal Weight { get; set; }
    public string? Name { get; set; }
    public int CampusId { get; set; }
    
    public int FromNodeId { get; set; }
    public Node FromNode { get; set; } = null!;
    public int ToNodeId { get; set; }
    public Node ToNode { get; set; } = null!;
}
