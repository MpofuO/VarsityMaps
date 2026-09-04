namespace API.DTOs;

public class EdgeDto
{
    public int EdgeId { get; set; }
    public int FromNodeId { get; set; }
    public int ToNodeId { get; set; }
    public decimal Weight { get; set; }
    public string? Name { get; set; }
}