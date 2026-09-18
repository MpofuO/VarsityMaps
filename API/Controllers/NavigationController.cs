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
    public async Task<ActionResult<IEnumerable<RouteDto>>> GetRoute(
        [FromQuery] int fromBuildingId,
        [FromQuery] int toBuildingId,
        [FromQuery] TravelMode mode = TravelMode.Walking)
    {
        if (fromBuildingId == toBuildingId) 
            return BadRequest("Origin and destination must be different buildings.");

        var (campusId, isGuest) = await User.GetNavigationContextAsync(userManager, uow);
        if (campusId == 0) 
            return BadRequest("No active campus set for this user.");

        var fromBuilding = await uow.BuildingRepository.GetByIdAsync(fromBuildingId);
        var toBuilding = await uow.BuildingRepository.GetByIdAsync(toBuildingId);
        if (fromBuilding is null || toBuilding is null) 
            return BadRequest("Invalid building(s) specified.");

        if (fromBuilding.CampusId != campusId || toBuilding.CampusId != campusId)
            return BadRequest("Both buildings must belong to the campus you're currently viewing.");

        var navigableEdges = isGuest
            ? await uow.EdgeRepository.GetGuestNavigableEdgesAsync(campusId, mode)
            : await uow.EdgeRepository.GetNavigableEdgesAsync(campusId, mode);

        navigableEdges = navigableEdges.Where(e => !(e.IsClosed && (e.ClosedUntil == null || e.ClosedUntil > DateTime.UtcNow)))
                                    .ToList();

        var fromEntrances = await uow.NodeRepository.GetByBuildingAsync(fromBuildingId);
        var toEntrances = await uow.NodeRepository.GetByBuildingAsync(toBuildingId);
        if (!fromEntrances.Any() || !toEntrances.Any())
            return BadRequest("One or both buildings have no registered entrances.");

        var routes = routeService.GetShortestPath(navigableEdges, fromEntrances, toEntrances);
        if (routes is null || !routes.Any()) 
            return BadRequest($"No {mode.ToString().ToLower()} route could be found between the specified buildings.");

        foreach (var route in routes)
        {
            route.FromBuildingId = fromBuildingId;
            route.ToBuildingId = toBuildingId;
            route.CampusId = campusId;
            route.TravelMode = mode;
            route.SearchCount = 1;
            route.LastRetrieved = DateTime.UtcNow;

            await uow.RouteRepository.CreateAsync(route);
        }

        await uow.CompleteAsync();

        return Ok(routes.Select(r => r.ToDto()));
    }
}