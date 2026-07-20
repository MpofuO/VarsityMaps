namespace API.DTOs;

public class RegisterDto
{
    public string Email { get; set; } = string.Empty;
    public int? CampusId { get; set; }
    public int UniversityId { get; set; }
    public string Password { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}
