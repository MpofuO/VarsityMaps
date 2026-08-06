using NetTopologySuite.Geometries;

namespace API.DTOs;

public class AddNodeItemDto
{
    public int? ExistingNodeId { get; set; }
    public string? Name { get; set; }
    public Point? Location { get; set; }
}

public class AddNodeDto
{
    public required List<AddNodeItemDto> Nodes { get; set; }
}