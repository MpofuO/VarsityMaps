using API.DTOs;
using API.Entities;
using API.Extensions;
using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

// BuildingController.cs
[ApiController]
[Route("api/[controller]")]
public class BuildingController(UserManager<AppUser> userManager, IUnitOfWork uow) : ControllerBase
{
    [HttpGet("campus/{campusId:int}")]
    [Authorize(Policy = "RequireCampusAdminOrStandardUserRole")]
    public async Task<ActionResult<IEnumerable<BuildingDto>>> GetBuildings()
    {
        var buildings = await uow.BuildingRepository.GetByCampusAsync(await User.GetCampusIdAsync(userManager));
        return Ok(buildings.Select(b => b.ToDto()));
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = "RequireCampusAdminOrStandardUserRole")]
    public async Task<ActionResult<BuildingDto>> GetBuilding(int id)
    {
        var building = await uow.BuildingRepository.GetWithEntrancesAsync(id);
        if (building is null) return NotFound();

        var callerCampusId = await User.GetCampusIdAsync(userManager);
        if (building.CampusId != callerCampusId) return NotFound();

        return Ok(building.ToDto());
    }

    [HttpPost]
    [Authorize(Policy = "RequireCampusAdminRole")]
    public async Task<ActionResult> AddBuilding(BuildingDto buildingDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var building = new Building
        {
            Name = buildingDto.Name,
            Alias = buildingDto.Alias,
            IsAccessible = buildingDto.IsAccessible,
            IsGuestAccessible = buildingDto.IsGuestAccessible,
            Boundary = buildingDto.Boundary,
            CampusId = await User.GetCampusIdAsync(userManager)
        };

        await uow.BuildingRepository.CreateAsync(building);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to add building.");
        return Ok(building.ToDto());
    }

    [HttpPut("{buildingId:int}")]
    [Authorize(Policy = "RequireCampusAdminRole")]
    public async Task<ActionResult> EditBuilding(int buildingId, BuildingDto buildingDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var building = await uow.BuildingRepository.GetByIdAsync(buildingId);
        if (building is null) return NotFound();

        var callerCampusId = await User.GetCampusIdAsync(userManager);
        if (building.CampusId != callerCampusId) return NotFound();

        building.Name = buildingDto.Name;
        building.Alias = buildingDto.Alias;
        building.IsAccessible = buildingDto.IsAccessible;
        building.IsGuestAccessible = buildingDto.IsGuestAccessible;

        await uow.BuildingRepository.UpdateAsync(building);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to update building.");
        return Ok(building.ToDto());
    }
}