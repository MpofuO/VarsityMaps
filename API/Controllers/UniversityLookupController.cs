using API.DTOs;
using API.Entities;
using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UniversityLookupController(IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<UniversityLookupDto>>> GetAll()
    {
        var lookups = await uow.UniversityLookupRepository.GetAllAsync();
        return Ok(lookups.OrderBy(item => item.Name).Select(ToDto));
    }

    [HttpPost]
    [Authorize(Policy = "RequireSystemAdminRole")]
    public async Task<ActionResult<UniversityLookupDto>> Create(SaveUniversityLookupDto model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (await NameExistsAsync(model.Name)) return BadRequest("A lookup with this name already exists.");

        var lookup = new UniversityLookup
        {
            Name = model.Name.Trim(),
            Latitude = model.Latitude,
            Longitude = model.Longitude
        };
        await uow.UniversityLookupRepository.CreateAsync(lookup);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to create location lookup.");
        return Ok(ToDto(lookup));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "RequireSystemAdminRole")]
    public async Task<ActionResult<UniversityLookupDto>> Update(int id, SaveUniversityLookupDto model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var lookup = await uow.UniversityLookupRepository.GetByIdAsync(id);
        if (lookup is null) return BadRequest("Location lookup not found.");
        if (await NameExistsAsync(model.Name, id)) return BadRequest("A lookup with this name already exists.");

        lookup.Name = model.Name.Trim();
        lookup.Latitude = model.Latitude;
        lookup.Longitude = model.Longitude;
        await uow.UniversityLookupRepository.UpdateAsync(lookup);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to update location lookup.");
        return Ok(ToDto(lookup));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "RequireSystemAdminRole")]
    public async Task<ActionResult> Delete(int id)
    {
        var lookup = await uow.UniversityLookupRepository.GetByIdAsync(id);
        if (lookup is null) return BadRequest("Location lookup not found.");

        await uow.UniversityLookupRepository.DeleteAsync(lookup);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to delete location lookup.");
        return NoContent();
    }

    private async Task<bool> NameExistsAsync(string name, int? exceptId = null)
    {
        var normalizedName = name.Trim();
        var lookups = await uow.UniversityLookupRepository.GetAllAsync();
        return lookups.Any(item => item.UniversityLookupId != exceptId &&
            string.Equals(item.Name, normalizedName, StringComparison.OrdinalIgnoreCase));
    }

    private static UniversityLookupDto ToDto(UniversityLookup lookup) => new()
    {
        UniversityLookupId = lookup.UniversityLookupId,
        Name = lookup.Name,
        Latitude = lookup.Latitude,
        Longitude = lookup.Longitude
    };
}