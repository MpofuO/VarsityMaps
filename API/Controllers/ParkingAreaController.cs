using API.DTOs;
using API.Entities;
using API.Extensions;
using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ParkingAreaController(UserManager<AppUser> userManager, IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "RequireCampusAdminOrStandardUserRole")]
    public async Task<ActionResult<IEnumerable<ParkingAreaDto>>> GetParkingAreas()
    {
        var (campusId, isGuest) = await User.GetCampusIdAsync(userManager);
        var parkingAreas = await uow.ParkingAreaRepository.GetByCampusAsync(campusId);

        if (User.IsInRole("StandardUser"))
        {
            parkingAreas = parkingAreas.Where(p => p.IsAccessible);
            if (isGuest)
                parkingAreas = parkingAreas.Where(p => p.IsGuestAccessible);
        }

        return Ok(parkingAreas.Select(p => p.ToDto()));
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = "RequireCampusAdminOrStandardUserRole")]
    public async Task<ActionResult<ParkingAreaDto>> GetParkingArea(int id)
    {
        var parkingArea = await uow.ParkingAreaRepository.GetWithAccessNodesAsync(id);
        if (parkingArea is null) return BadRequest("Parking area not found.");

        var (campusId, _) = await User.GetCampusIdAsync(userManager);
        if (parkingArea.CampusId != campusId) return BadRequest("Parking area not found.");

        return Ok(parkingArea.ToDto());
    }

    [HttpPost]
    [Authorize(Policy = "RequireCampusAdminRole")]
    public async Task<ActionResult<ParkingAreaDto>> AddParkingArea(ParkingAreaDto parkingAreaDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (campusId, _) = await User.GetCampusIdAsync(userManager);
        var existingAreas = await uow.ParkingAreaRepository.GetByCampusAsync(campusId);

        if (existingAreas.Any(p => p.Name.Equals(parkingAreaDto.Name, StringComparison.OrdinalIgnoreCase)))
            return BadRequest("A parking area with this name already exists.");

        if (parkingAreaDto.Boundary.IsEmpty || !parkingAreaDto.Boundary.IsValid)
            return BadRequest("A valid parking area outline is required.");

        var existingBuildings = await uow.BuildingRepository.GetByCampusAsync(campusId);
        var existingParkingAreas = await uow.ParkingAreaRepository.GetByCampusAsync(campusId);
        if (existingBuildings.Any(b => b.Boundary.Intersects(parkingAreaDto.Boundary)) ||
            existingParkingAreas.Any(p => p.Boundary.Intersects(parkingAreaDto.Boundary)))
            return BadRequest("This parking area's outline overlaps an existing building or parking area.");
        
        
        var parkingArea = new ParkingArea
        {
            Name = parkingAreaDto.Name.Trim(),
            IsAccessible = parkingAreaDto.IsGuestAccessible || parkingAreaDto.IsAccessible,
            IsGuestAccessible = parkingAreaDto.IsGuestAccessible,
            Boundary = parkingAreaDto.Boundary,
            CampusId = campusId
        };

        await uow.ParkingAreaRepository.CreateAsync(parkingArea);
        await uow.RouteRepository.DeleteByCampusAsync(campusId);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to add parking area.");

        return Ok(parkingArea.ToDto());
    }

    [HttpPut("{parkingAreaId:int}")]
    [Authorize(Policy = "RequireCampusAdminRole")]
    public async Task<ActionResult<ParkingAreaDto>> EditParkingArea(int parkingAreaId, ParkingAreaDto parkingAreaDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var parkingArea = await uow.ParkingAreaRepository.GetByIdAsync(parkingAreaId);
        if (parkingArea is null) return BadRequest("Parking area not found.");

        var (campusId, _) = await User.GetCampusIdAsync(userManager);
        if (parkingArea.CampusId != campusId) return BadRequest("Parking area not found.");

        var existingAreas = await uow.ParkingAreaRepository.GetByCampusAsync(campusId);
        if (existingAreas.Any(p => p.ParkingAreaId != parkingAreaId &&
                                   p.Name.Equals(parkingAreaDto.Name, StringComparison.OrdinalIgnoreCase)))
            return BadRequest("A parking area with this name already exists.");

        if (parkingAreaDto.Boundary.IsEmpty || !parkingAreaDto.Boundary.IsValid)
            return BadRequest("A valid parking area outline is required.");

        parkingArea.Name = parkingAreaDto.Name.Trim();
        parkingArea.IsAccessible = parkingAreaDto.IsGuestAccessible || parkingAreaDto.IsAccessible;
        parkingArea.IsGuestAccessible = parkingAreaDto.IsGuestAccessible;
        parkingArea.Boundary = parkingAreaDto.Boundary;

        await uow.ParkingAreaRepository.UpdateAsync(parkingArea);
        await uow.RouteRepository.DeleteByCampusAsync(campusId);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to update parking area.");

        return Ok(parkingArea.ToDto());
    }

    [HttpDelete("{parkingAreaId:int}")]
    [Authorize(Policy = "RequireCampusAdminRole")]
    public async Task<ActionResult> DeleteParkingArea(int parkingAreaId)
    {
        var parkingArea = await uow.ParkingAreaRepository.GetByIdAsync(parkingAreaId);
        if (parkingArea is null) return BadRequest("Parking area not found.");

        var (campusId, _) = await User.GetCampusIdAsync(userManager);
        if (parkingArea.CampusId != campusId) return BadRequest("Parking area not found.");

        var accessNodes = (await uow.NodeRepository.GetByParkingAreaAsync(parkingAreaId)).ToList();
        foreach (var node in accessNodes)
        {
            node.ParkingAreaId = null;
            await uow.NodeRepository.UpdateAsync(node);
        }

        await uow.ParkingAreaRepository.DeleteAsync(parkingArea);
        await uow.RouteRepository.DeleteByCampusAsync(campusId);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to delete parking area.");

        return Ok();
    }
}