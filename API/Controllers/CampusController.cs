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
[Authorize(Policy = "RequireUniversityAdminRole")]
public class CampusController(UserManager<AppUser> userManager, IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
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
    public async Task<ActionResult> Create(CampusDto campusDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var campus = new Campus
        {
            Name = campusDto.Name,
            Alias = campusDto.Alias,
            Center = campusDto.Center,
            UniversityId = await User.GetUniversityIdAsync(userManager)
        };

        await uow.CampusRepository.CreateAsync(campus);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to create campus.");
        return Ok(campus.ToDto());
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult> Update(int id, CampusDto campusDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var campus = await uow.CampusRepository.GetByIdAsync(id);
        if (campus is null) return NotFound();

        campus.Name = campusDto.Name;
        campus.Alias = campusDto.Alias;
        campus.Center = campusDto.Center;

        await uow.CampusRepository.UpdateAsync(campus);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to update campus.");
        return Ok(campus.ToDto());
    }
}