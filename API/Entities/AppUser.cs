using Microsoft.AspNetCore.Identity;

namespace API.Entities;

public class AppUser : IdentityUser
{
    public int UniversityId { get; set; }
    public int? CampusId { get; set; }
    public bool IsActive { get; set; }
    public bool IsDeleted { get; set; }
}
