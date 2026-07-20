namespace API.Entities;

public class Edge
{
    public int EdgeId { get; set; }
    public decimal Weight { get; set; }

    public int CampusId { get; set; }
    public Campus Campus {get; set;} = null!;
    public int FromNodeId { get; set; }
    public Node FromNode { get; set; } = null!;
    public int ToNodeId { get; set; }
    public Node ToNode { get; set; } = null!;
}
