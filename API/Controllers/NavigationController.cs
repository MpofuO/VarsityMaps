using API.DTOs;
using API.Entities;
using API.Extensions;
using API.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NavigationController(UserManager<AppUser> userManager, IUnitOfWork uow, IRouteService routeService) : ControllerBase
{
    [HttpGet("route")]
    public async Task<ActionResult<RouteDto>> GetRoute([FromQuery] int fromBuildingId, [FromQuery] int toBuildingId)
    {
        var (campusId, isGuest) = await User.GetNavigationContextAsync(userManager, uow);
        if (campusId == 0) return BadRequest("No active campus set for this user.");

        var route = await uow.RouteRepository.GetByBuildingsAsync(fromBuildingId, toBuildingId);
        if (route is not null) return Ok(route);

        var navigableEdges = isGuest ? await uow.EdgeRepository.GetGuestNavigableEdgesAsync(campusId)
            : await uow.EdgeRepository.GetNavigableEdgesAsync(campusId);

        var fromBuilding = await uow.BuildingRepository.GetByIdAsync(fromBuildingId);
        var toBuilding = await uow.BuildingRepository.GetByIdAsync(toBuildingId);
        if (fromBuilding is null || toBuilding is null) return BadRequest("Invalid building(s) specified.");

        var fromEntrances = await uow.NodeRepository.GetByBuildingAsync(fromBuildingId);
        var toEntrances = await uow.NodeRepository.GetByBuildingAsync(toBuildingId);
        if (fromEntrances.Count() == 0 || toEntrances.Count() == 0)
            return BadRequest("One or both buildings have no registered entrances.");

        route = routeService.GetShortestPath(navigableEdges, fromEntrances, toEntrances);
        if (route is null) return BadRequest("No route could be found between the specified buildings.");

        await uow.RouteRepository.CreateAsync(route);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to save the generated route to the database.");

        return Ok(route);
    }
}
