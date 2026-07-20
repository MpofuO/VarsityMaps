namespace API.DTOs;

public class ApplicationDto
{
    public string UserId { get; set; } = string.Empty;
    public string UniversityName { get; set; } = string.Empty;
    public string UniversityAlias { get; set; } = string.Empty;
    public int CampusCount { get; set; }
    public DateTime DateCreated { get; set; }
    public bool? IsApproved { get; set; }
    public string? Notes { get; set; }
}
