namespace API.Entities;

public class Application
{
    public required string ApplicationId { get; set; }
    public required string UserId { get; set; }
    public required string UniversityName { get; set; }
    public required string UniversityAlias { get; set; }
    public int CampusCount { get; set; }
    public DateTime DateCreated { get; set; }
    public bool? IsApproved { get; set; }
    public string DecisionReason { get; set; } = string.Empty;
}
