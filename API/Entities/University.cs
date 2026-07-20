namespace API.Entities;

public class University
{
    public int UniversityId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Alias { get; set; } = string.Empty;
    
    public ICollection<Campus> Campuses { get; set; } = [];
}
