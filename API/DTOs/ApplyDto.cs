namespace API.DTOs;

public class ApplyDto
{
    public required string Email { get; set; }
    public required string Password { get; set; }
    public required string UniversityName { get; set; }
    public required string UniversityAlias { get; set; }
}