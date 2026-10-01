namespace API.Entities;

public class UniversityLookup
{
    public int UniversityLookupId { get; set; }
    public required string Name { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}