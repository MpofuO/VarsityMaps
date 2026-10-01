using System.ComponentModel.DataAnnotations;

namespace API.DTOs;

public class UniversityLookupDto
{
    public int UniversityLookupId { get; set; }

    [Required]
    [StringLength(160)]
    public required string Name { get; set; }

    [Range(-90, 90)]
    public double Latitude { get; set; }

    [Range(-180, 180)]
    public double Longitude { get; set; }
}

public class SaveUniversityLookupDto
{
    [Required]
    [StringLength(160)]
    public required string Name { get; set; }

    [Range(-90, 90)]
    public double Latitude { get; set; }

    [Range(-180, 180)]
    public double Longitude { get; set; }
}