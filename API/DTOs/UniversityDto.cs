namespace API.DTOs;

public class UniversityDto
{
    public int UniversityId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Alias { get; set; } = string.Empty;
    public int CampusCount { get; set; } = 0;
    public string? AdminEmail { get; set; }
}
