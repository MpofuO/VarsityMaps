namespace API.DTOs;

public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int? CampusId { get; set; }
    public int UniversityId { get; set; }
    public string Token { get; set; } = string.Empty;
}
