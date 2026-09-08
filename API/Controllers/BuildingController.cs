using API.DTOs;
using API.Entities;
using API.Extensions;
using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BuildingController(UserManager<AppUser> userManager, IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "RequireCampusAdminOrStandardUserRole")]
    public async Task<ActionResult<IEnumerable<BuildingDto>>> GetBuildings()
    {
        var (campusId, isGuest) = await User.GetCampusIdAsync(userManager);
        var buildings = await uow.BuildingRepository.GetByCampusAsync(campusId);

        if (isGuest) buildings = buildings.Where(b => b.IsGuestAccessible);

        return Ok(buildings.Select(b => b.ToDto()));
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = "RequireCampusAdminOrStandardUserRole")]
    public async Task<ActionResult<BuildingDto>> GetBuilding(int id)
    {
        var building = await uow.BuildingRepository.GetWithEntrancesAsync(id);
        if (building is null) return NotFound();

        var (callerCampusId, _) = await User.GetCampusIdAsync(userManager);
        if (building.CampusId != callerCampusId) return NotFound();

        return Ok(building.ToDto());
    }

    [HttpPost]
    [Authorize(Policy = "RequireCampusAdminRole")]
    public async Task<ActionResult> AddBuilding(BuildingDto buildingDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (campusId, _) = await User.GetCampusIdAsync(userManager);

        var existingBuilding = await uow.BuildingRepository.GetByNameAsync(campusId, buildingDto.Name);
        if (existingBuilding is not null) return BadRequest("A building with this name already exists.");

        existingBuilding = await uow.BuildingRepository.GetByAliasAsync(campusId, buildingDto.Alias);
        if (existingBuilding is not null) return BadRequest("A building with this alias already exists.");

        var existingBuildings = await uow.BuildingRepository.GetByCampusAsync(campusId);
        if (existingBuildings.Any(b => b.Boundary.Intersects(buildingDto.Boundary)))
            return BadRequest("This building's outline overlaps an existing building.");

        var building = new Building
        {
            Name = buildingDto.Name,
            Alias = buildingDto.Alias,
            IsAccessible = buildingDto.IsGuestAccessible ? true : buildingDto.IsAccessible,
            IsGuestAccessible = buildingDto.IsGuestAccessible,
            Boundary = buildingDto.Boundary,
            CampusId = campusId
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

        var (callerCampusId, _) = await User.GetCampusIdAsync(userManager);
        if (building.CampusId != callerCampusId) return NotFound();

        var existingBuilding = await uow.BuildingRepository.GetByNameAsync(callerCampusId, buildingDto.Name);
        if (existingBuilding != null && existingBuilding.BuildingId != building.BuildingId)
            return BadRequest("A building with this name already exists.");

        existingBuilding = await uow.BuildingRepository.GetByAliasAsync(callerCampusId, buildingDto.Alias);
        if (existingBuilding != null && existingBuilding.BuildingId != building.BuildingId) return BadRequest("A building with this alias already exists.");

        building.Name = buildingDto.Name;
        building.Alias = buildingDto.Alias;
        building.IsAccessible = buildingDto.IsGuestAccessible ? true : buildingDto.IsAccessible;
        building.IsGuestAccessible = buildingDto.IsGuestAccessible;

        await uow.BuildingRepository.UpdateAsync(building);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to update building.");
        return Ok(building.ToDto());
    }

    [HttpDelete("{buildingId:int}")]
    [Authorize(Policy = "RequireCampusAdminRole")]
    public async Task<ActionResult> DeleteBuilding(int buildingId)
    {
        var building = await uow.BuildingRepository.GetWithEntrancesAsync(buildingId);
        if (building is null) return NotFound();

        var (callerCampusId, _) = await User.GetCampusIdAsync(userManager);
        if (building.CampusId != callerCampusId) return NotFound();

        foreach (Node entrance in building.Entrances)
        {
            entrance.BuildingId = null;
            await uow.NodeRepository.UpdateAsync(entrance);
        }

        await uow.BuildingRepository.DeleteAsync(building);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to delete building.");
        return Ok();
    }
}