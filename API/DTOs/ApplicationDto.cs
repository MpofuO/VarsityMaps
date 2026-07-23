namespace API.DTOs;

public class ApplicationDto
{
    public int ApplicationId { get; set; }
    public string UniversityName { get; set; } = string.Empty;
    public string UniversityAlias { get; set; } = string.Empty;
    public int CampusCount { get; set; }
    public DateTime DateCreated { get; set; }
    public bool? IsApproved { get; set; }
    public string DecisionReason { get; set; } = string.Empty;
}
