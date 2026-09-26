using API.DTOs;
using API.Entities;
using Route = API.Entities.Route;
using API.Extensions;
using API.Helpers;
using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using NetTopologySuite.Geometries;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NavigationController(UserManager<AppUser> userManager, IUnitOfWork uow, IRouteService routeService) : ControllerBase
{
    [HttpGet("route")]
    public async Task<ActionResult<IEnumerable<RouteDto>>> GetRoute(
        [FromQuery] int fromBuildingId, [FromQuery] int toBuildingId,
        [FromQuery] TravelMode mode = TravelMode.Walking, [FromQuery] int? originParkingAreaId = null,
        [FromQuery] string? destinationInterest = null)
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

        var fromEntrances = await uow.NodeRepository.GetByBuildingAsync(fromBuildingId);
        var allDestinationEntrances = (await uow.NodeRepository.GetByBuildingAsync(toBuildingId)).ToList();
        if (allDestinationEntrances.Count == 0)
            return BadRequest("The destination or origin building has no registered entrances.");

        var availableInterests = allDestinationEntrances
            .SelectMany(entrance => EntranceInterestHelper.Parse(entrance.InterestOfEntrance))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(interest => interest, StringComparer.OrdinalIgnoreCase)
            .ToList();
        var hasConfiguredInterests = availableInterests.Count > 0;
        List<Node> toEntrances;

        if (hasConfiguredInterests)
        {
            if (string.IsNullOrWhiteSpace(destinationInterest))
            {
                return Conflict(new DestinationInterestRequiredDto
                {
                    Interests = availableInterests
                });
            }

            var selectedInterest = destinationInterest.Trim();
            if (!availableInterests.Contains(selectedInterest, StringComparer.OrdinalIgnoreCase))
                return BadRequest("The selected destination interest is not available for this building.");

            toEntrances = allDestinationEntrances
                .Where(entrance =>
                {
                    var entranceInterests = EntranceInterestHelper.Parse(entrance.InterestOfEntrance);
                    return entranceInterests.Count == 0 || entranceInterests.Contains(selectedInterest, StringComparer.OrdinalIgnoreCase);
                })
                .ToList();
        }
        else
        {
            toEntrances = allDestinationEntrances;
        }

        var cachedRoutes = await uow.RouteRepository.GetByBuildingsWithGuidesAsync(
            fromBuildingId, toBuildingId, mode, null);

        if (originParkingAreaId is not null)
        {
            var parkingCachedRoutes = await uow.RouteRepository.GetByBuildingsWithGuidesAsync(
                fromBuildingId, toBuildingId, mode, originParkingAreaId);
            if (hasConfiguredInterests)
                cachedRoutes = cachedRoutes.Concat(parkingCachedRoutes).DistinctBy(route => route.RouteId).ToList();
            else if (cachedRoutes.Count == 0)
                cachedRoutes = parkingCachedRoutes;
        }

        if (!hasConfiguredInterests && cachedRoutes.Count > 0)
        {
            foreach (var cachedRoute in cachedRoutes)
            {
                cachedRoute.SearchCount++;
                cachedRoute.LastRetrieved = DateTime.UtcNow;
            }

            await uow.CompleteAsync();
            return Ok(cachedRoutes.Select(route => route.ToDto()));
        }

        if (mode != TravelMode.Car && mode != TravelMode.Bus && !fromEntrances.Any())
            return BadRequest("The destination or origin building has no registered entrances.");

        List<Route> routes;
        ParkingArea? selectedOriginParkingArea = null;
        int? routeOriginParkingAreaId = null;

        if (mode == TravelMode.Car || mode == TravelMode.Bus)
        {
            var drivingEdges = isGuest
                ? await uow.EdgeRepository.GetGuestNavigableEdgesAsync(campusId, mode)
                : await uow.EdgeRepository.GetNavigableEdgesAsync(campusId, mode);
            drivingEdges = drivingEdges.Where(e => !(e.IsClosed && (e.ClosedUntil == null || e.ClosedUntil > DateTime.UtcNow))).ToList();

            //First try to find a direct route between the two buildings. If none exists, then we will require the user to select a parking area.
            routes = routeService.GetShortestPath(drivingEdges, fromEntrances, toEntrances);

            if (!routes.Any())
            {
                var parkingAreas = await uow.ParkingAreaRepository.GetByCampusAsync(campusId);
                var accessibleParkingAreas = parkingAreas
                    .Where(p => p.IsAccessible && (!isGuest || p.IsGuestAccessible) && p.AccessNodes.Any())
                    .ToList();

                if (!accessibleParkingAreas.Any())
                    return BadRequest("No route could be found for this mode of travel.");

                if (originParkingAreaId is null)
                {
                    return Conflict(new OriginParkingRequiredDto
                    {
                        ParkingAreas = accessibleParkingAreas.Select(p => new ParkingAreaOptionDto
                        {
                            ParkingAreaId = p.ParkingAreaId,
                            Name = p.Name,
                            Boundary = p.Boundary,
                            AccessNodeIds = p.AccessNodes.Select(n => n.NodeId).ToList()
                        }).ToList()
                    });
                }

                selectedOriginParkingArea = accessibleParkingAreas
                    .FirstOrDefault(p => p.ParkingAreaId == originParkingAreaId.Value);
                if (selectedOriginParkingArea is null)
                    return BadRequest("The selected origin parking area was not found.");

                // First allow a direct vehicle route from the selected parking area to the destination building.
                routes = routeService.GetShortestPath(drivingEdges, selectedOriginParkingArea.AccessNodes, toEntrances);
                if (routes.Any())
                {
                    routeOriginParkingAreaId = selectedOriginParkingArea.ParkingAreaId;
                }
                else
                {
                    var walkingEdges = isGuest
                        ? await uow.EdgeRepository.GetGuestNavigableEdgesAsync(campusId, TravelMode.Walking)
                        : await uow.EdgeRepository.GetNavigableEdgesAsync(campusId, TravelMode.Walking);
                    walkingEdges = walkingEdges
                        .Where(e => !(e.IsClosed && (e.ClosedUntil == null || e.ClosedUntil > DateTime.UtcNow)))
                        .ToList();

                    var destinationParkingArea = accessibleParkingAreas
                        .OrderBy(p => p.Boundary.Distance(toBuilding.Boundary))
                        .First();

                    routes = routeService.GetParkingOriginPath(
                        drivingEdges,
                        walkingEdges,
                        selectedOriginParkingArea.AccessNodes,
                        toEntrances,
                        destinationParkingArea.AccessNodes);
                    routeOriginParkingAreaId = selectedOriginParkingArea.ParkingAreaId;
                }
            }
        }
        else
        {
            var navigableEdges = isGuest
                ? await uow.EdgeRepository.GetGuestNavigableEdgesAsync(campusId, mode)
                : await uow.EdgeRepository.GetNavigableEdgesAsync(campusId, mode);

            navigableEdges = navigableEdges
                .Where(e => !(e.IsClosed && (e.ClosedUntil == null || e.ClosedUntil > DateTime.UtcNow)))
                .ToList();

            routes = routeService.GetShortestPath(navigableEdges, fromEntrances, toEntrances);
        }

        if (routes is null || !routes.Any())
            return BadRequest($"No {mode.ToString().ToLower()} route could be found between the specified buildings.");

        var responseRoutes = new List<Route>();
        foreach (var route in routes)
        {
            if (hasConfiguredInterests)
            {
                var matchingCachedRoute = cachedRoutes.FirstOrDefault(cachedRoute =>
                    cachedRoute.FromNodeId == route.FromNodeId &&
                    cachedRoute.ToNodeId == route.ToNodeId &&
                    cachedRoute.OriginParkingAreaId == routeOriginParkingAreaId &&
                    cachedRoute.TransitionNodeId == route.TransitionNodeId &&
                    cachedRoute.TransitionParkingAreaId == route.TransitionParkingAreaId);

                if (matchingCachedRoute is not null)
                {
                    matchingCachedRoute.SearchCount++;
                    matchingCachedRoute.LastRetrieved = DateTime.UtcNow;
                    responseRoutes.Add(matchingCachedRoute);
                    continue;
                }
            }

            route.FromBuildingId = fromBuildingId;
            route.ToBuildingId = toBuildingId;
            route.CampusId = campusId;
            route.TravelMode = mode;
            route.OriginParkingAreaId = routeOriginParkingAreaId;
            if (routeOriginParkingAreaId is not null)
            {
                route.OriginParkingAreaId = routeOriginParkingAreaId;
                route.OriginParkingNodeId = route.FromNodeId;
                route.OriginParkingLocation = new Point(route.Path.Coordinates[0]) { SRID = 4326 };
            }
            route.SearchCount = 1;
            route.LastRetrieved = DateTime.UtcNow;

            await uow.RouteRepository.CreateAsync(route);
            responseRoutes.Add(route);
        }

        await uow.CompleteAsync();

        return Ok(responseRoutes.Select(route => route.ToDto()));
    }

    [HttpGet("route-guides/{routeId}")]
    public async Task<ActionResult<IEnumerable<RouteGuideDto>>> GetRouteGuides(int routeId)
    {
        var route = await uow.RouteRepository.GetWithRouteGuidesAsync(routeId);
        if (route is null)
            return NotFound("Route not found.");

        if (route.RouteGuides.Count == 0)
        {
            string? parkingAreaName = null;
            if (route.TransitionParkingAreaId is int parkingAreaId)
            {
                parkingAreaName = (await uow.ParkingAreaRepository.GetByIdAsync(parkingAreaId))?.Name;
            }

            route.RouteGuides = routeService.GetRouteGuides(route, parkingAreaName)
                .Select(guide => new RouteGuide
                {
                    StepIndex = guide.StepIndex,
                    Location = guide.Location,
                    Instruction = guide.Instruction,
                    TravelMode = guide.TravelMode,
                    IsTransition = guide.IsTransition,
                    ParkingAreaId = guide.ParkingAreaId
                })
                .ToList();

            await uow.CompleteAsync();
        }

        return Ok(route.RouteGuides
            .OrderBy(guide => guide.StepIndex)
            .Select(guide => guide.ToDto()));
    }

    [HttpGet("path-edges")]
    [Authorize(Policy = "RequireCampusAdminRole")]
    public async Task<ActionResult<IEnumerable<int>>> GetPathEdges([FromQuery] int startNodeId, [FromQuery] int endNodeId)
    {
        if (startNodeId == endNodeId)
            return BadRequest("Start and end nodes must be different.");

        var (campusId, _) = await User.GetNavigationContextAsync(userManager, uow);
        if (campusId == 0)
            return BadRequest("No active campus set for this user.");

        var campusEdges = await uow.EdgeRepository.GetByCampusAsync(campusId);

        var startNode = await uow.NodeRepository.GetByIdAsync(startNodeId);
        var endNode = await uow.NodeRepository.GetByIdAsync(endNodeId);
        if (startNode is null || endNode is null)
            return BadRequest("Invalid node(s) specified.");

        var routes = routeService.GetShortestPath(campusEdges.ToList(), [startNode], [endNode]);
        if (routes is null || !routes.Any())
            return NotFound("No route path could be found between the specified nodes.");

        var shortestRoute = routes.OrderBy(r => r.Weight).First();

        var edgeIds = new List<int>();
        var coords = shortestRoute.Path.Coordinates;

        for (int i = 0; i < coords.Length - 1; i++)
        {
            var c1 = coords[i];
            var c2 = coords[i + 1];

            var matchingEdge = campusEdges.FirstOrDefault(e =>
                (Math.Abs(e.FromNode.Location.X - c1.X) < 1e-6 && Math.Abs(e.FromNode.Location.Y - c1.Y) < 1e-6 &&
                 Math.Abs(e.ToNode.Location.X - c2.X) < 1e-6 && Math.Abs(e.ToNode.Location.Y - c2.Y) < 1e-6) ||
                (Math.Abs(e.FromNode.Location.X - c2.X) < 1e-6 && Math.Abs(e.FromNode.Location.Y - c2.Y) < 1e-6 &&
                 Math.Abs(e.ToNode.Location.X - c1.X) < 1e-6 && Math.Abs(e.ToNode.Location.Y - c1.Y) < 1e-6));

            if (matchingEdge != null)
            {
                edgeIds.Add(matchingEdge.EdgeId);
            }
        }

        return Ok(edgeIds);
    }
}