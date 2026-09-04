using API.DTOs;
using API.Entities;
using API.Extensions;
using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

// CampusController.cs
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireUniversityAdminOrCampusAdminRole")]
public class CampusController(UserManager<AppUser> userManager, IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "RequireUniversityAdminRole")]
    public async Task<ActionResult<IEnumerable<CampusDto>>> GetAll()
    {
        int universityId = await User.GetUniversityIdAsync(userManager);
        var campuses = await uow.CampusRepository.GetByUniversityAsync(universityId);
        return Ok(campuses.Select(c => c.ToDto()));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CampusDto>> Get(int id)
    {
        var campus = await uow.CampusRepository.GetByIdAsync(id);
        if (campus is null) return NotFound();
        return Ok(campus.ToDto());
    }

    [HttpPost]
    [Authorize(Policy = "RequireUniversityAdminRole")]
    public async Task<ActionResult> Create(CampusDto campusDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var universityId = await User.GetUniversityIdAsync(userManager);
        var existingCampuses = await uow.CampusRepository.GetByUniversityAsync(universityId);

        if (existingCampuses.Any(c => c.Name.Equals(campusDto.Name, StringComparison.OrdinalIgnoreCase)))
            return BadRequest("A campus with this name already exists.");

        if (existingCampuses.Any(c => c.Alias.Equals(campusDto.Alias, StringComparison.OrdinalIgnoreCase)))
            return BadRequest("A campus with this alias already exists.");

        var campus = new Campus
        {
            Name = campusDto.Name,
            Alias = campusDto.Alias,
            Center = campusDto.Center,
            UniversityId = universityId
        };

        await uow.CampusRepository.CreateAsync(campus);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to create campus.");
        return Ok(campus.ToDto());
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "RequireUniversityAdminRole")]
    public async Task<ActionResult> Update(int id, CampusDto campusDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var campus = await uow.CampusRepository.GetByIdAsync(id);
        if (campus is null) return NotFound();

        var existingCampuses = (await uow.CampusRepository.GetByUniversityAsync(campus.UniversityId))
            .Where(c => c.CampusId != id);

        if (existingCampuses.Any(c => c.Name.Equals(campusDto.Name, StringComparison.OrdinalIgnoreCase)))
            return BadRequest("A campus with this name already exists.");

        if (existingCampuses.Any(c => c.Alias.Equals(campusDto.Alias, StringComparison.OrdinalIgnoreCase)))
            return BadRequest("A campus with this alias already exists.");

        campus.Name = campusDto.Name;
        campus.Alias = campusDto.Alias;
        campus.Center = campusDto.Center;

        await uow.CampusRepository.UpdateAsync(campus);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to update campus.");
        return Ok(campus.ToDto());
    }

    #region Campus Admin Management

    [HttpGet("{campusId:int}/admin")]
    [Authorize(Policy = "RequireUniversityAdminRole")]
    public async Task<ActionResult<CampusAdminDto>> GetAssignedAdmin(int campusId)
    {
        var campus = await uow.CampusRepository.GetByIdAsync(campusId);
        if (campus is null) return NotFound();

        var admin = await GetVerifiedCampusAdmin(campusId);
        if (admin is null) return NoContent();

        return Ok(new CampusAdminDto
        {
            Id = admin.Id,
            Email = admin.Email ?? string.Empty,
            IsActive = admin.IsActive
        });
    }

    [HttpPost("{campusId:int}/admin/suspend")]
    [Authorize(Policy = "RequireUniversityAdminRole")]
    public async Task<ActionResult> ToggleSuspendAdmin(int campusId, [FromBody] bool suspend)
    {
        var admin = await GetVerifiedCampusAdmin(campusId);
        if (admin is null) return NotFound();

        admin.IsActive = !suspend;
        var result = await userManager.UpdateAsync(admin);
        if (!result.Succeeded) return BadRequest("Failed to update admin status.");
        return Ok();
    }

    [HttpPost("{campusId:int}/admin/unassign")]
    [Authorize(Policy = "RequireUniversityAdminRole")]
    public async Task<ActionResult> RemoveAdmin(int campusId)
    {
        var admin = await GetVerifiedCampusAdmin(campusId);
        if (admin is null) return NotFound();
        
        var result = await userManager.RemoveFromRoleAsync(admin, "CampusAdmin");
        if(!result.Succeeded) return BadRequest("Failed to remove admin.");
        
        admin.IsDeleted = true;
        result = await userManager.UpdateAsync(admin);
        if (!result.Succeeded) return BadRequest("Failed to remove admin.");
        return Ok();
    }

    private async Task<AppUser?> GetVerifiedCampusAdmin(int campusId)
    {
        var campus = await uow.CampusRepository.GetByIdAsync(campusId);
        if (campus is null) return null;

        var callerUniversityId = await User.GetUniversityIdAsync(userManager);
        if (campus.UniversityId != callerUniversityId) return null;

        return (await userManager.GetUsersInRoleAsync("CampusAdmin"))
            .FirstOrDefault(u => u.CampusId == campusId);
    }
    #endregion
}