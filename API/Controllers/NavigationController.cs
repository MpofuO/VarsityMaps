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
[Authorize]
public class NavigationController(UserManager<AppUser> userManager, IUnitOfWork uow, IRouteService routeService) : ControllerBase
{
    [HttpGet("route")]
    public async Task<ActionResult<RouteDto>> GetRoute([FromQuery] int fromBuildingId, [FromQuery] int toBuildingId)
    {
        if (fromBuildingId == toBuildingId) return BadRequest("Origin and destination must be different buildings.");

        var (campusId, isGuest) = await User.GetNavigationContextAsync(userManager, uow);
        if (campusId == 0) return BadRequest("No active campus set for this user.");

        var existingRoute = await uow.RouteRepository.GetByBuildingsAsync(fromBuildingId, toBuildingId);
        if (existingRoute is not null)
        {
            existingRoute.SearchCount++;
            existingRoute.LastRetrieved = DateTime.UtcNow;
            await uow.RouteRepository.UpdateAsync(existingRoute);
            await uow.CompleteAsync();
            return Ok(existingRoute.ToDto());
        }

        var fromBuilding = await uow.BuildingRepository.GetByIdAsync(fromBuildingId);
        var toBuilding = await uow.BuildingRepository.GetByIdAsync(toBuildingId);
        if (fromBuilding is null || toBuilding is null) return BadRequest("Invalid building(s) specified.");

        if (fromBuilding.CampusId != campusId || toBuilding.CampusId != campusId)
            return BadRequest("Both buildings must belong to the campus you're currently viewing.");

        var navigableEdges = isGuest
            ? await uow.EdgeRepository.GetGuestNavigableEdgesAsync(campusId)
            : await uow.EdgeRepository.GetNavigableEdgesAsync(campusId);

        var fromEntrances = await uow.NodeRepository.GetByBuildingAsync(fromBuildingId);
        var toEntrances = await uow.NodeRepository.GetByBuildingAsync(toBuildingId);
        if (!fromEntrances.Any() || !toEntrances.Any())
            return BadRequest("One or both buildings have no registered entrances.");

        var route = routeService.GetShortestPath(navigableEdges, fromEntrances, toEntrances);
        if (route is null) return BadRequest("No route could be found between the specified buildings.");

        route.FromBuildingId = fromBuildingId;
        route.ToBuildingId = toBuildingId;
        route.CampusId = campusId;
        route.SearchCount = 1;
        route.LastRetrieved = DateTime.UtcNow;

        await uow.RouteRepository.CreateAsync(route);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to save the generated route to the database.");

        return Ok(route.ToDto());
    }
}