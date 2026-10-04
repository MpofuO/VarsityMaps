using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace API.Entities;

public class AppUser : IdentityUser
{
    [MaxLength(64)]
    public string? RefreshTokenHash { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    public int UniversityId { get; set; }
    public int? CurrentUniversityId { get; set; }
    public int? CampusId { get; set; }
    public bool IsActive { get; set; }
    public bool IsDeleted { get; set; }
}
