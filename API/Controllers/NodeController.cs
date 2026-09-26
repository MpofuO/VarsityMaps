using API.DTOs;
using API.Entities;
using API.Extensions;
using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using API.Helpers;
using NetTopologySuite.Geometries;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireCampusAdminRole")]
public class NodeController(UserManager<AppUser> userManager, IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<NodeDto>>> GetNodes()
    {
        var (campusId, _) = await User.GetCampusIdAsync(userManager);
        var nodes = await uow.NodeRepository.GetByCampusAsync(campusId);
        return Ok(nodes.Select(n => n.ToDto()).ToList());
    }

    [HttpPost("{buildingId:int}")]
    public async Task<ActionResult<NodeDto>> AddEntranceNode(int buildingId, NodeDto nodeDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (callerCampusId, _) = await User.GetCampusIdAsync(userManager);

        var building = await uow.BuildingRepository.GetByIdAsync(buildingId);
        if (building is null) return NotFound("Building not found.");
        if (building.CampusId != callerCampusId) return NotFound("Building not found.");

        if (building.Boundary.Contains(nodeDto.Location))
            return BadRequest("Entrance node cannot be placed inside the building.");

        var distance = building.Boundary.Distance(nodeDto.Location);
        var distanceMeters = GeoHelper.DegreeDistanceToMeters(distance, nodeDto.Location.Y);
        if (distanceMeters > 5)
            return BadRequest($"Entrance node must be within 5 meters of the building boundary (currently {distanceMeters:F1}m away).");

        var node = new Node
        {
            Name = nodeDto.Name,
            InterestOfEntrance = EntranceInterestHelper.Normalize(nodeDto.InterestOfEntrance),
            Location = nodeDto.Location,
            CampusId = callerCampusId,
            BuildingId = buildingId
        };

        await uow.NodeRepository.CreateAsync(node);
        await uow.RouteRepository.DeleteByBuildingAsync(buildingId);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to add entrance node.");
        return Ok(node.ToDto());
    }

    [HttpPost("parking-area/{parkingAreaId:int}")]
    public async Task<ActionResult<NodeDto>> AddParkingAccessNode(int parkingAreaId, NodeDto nodeDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (callerCampusId, _) = await User.GetCampusIdAsync(userManager);
        var parkingArea = await uow.ParkingAreaRepository.GetByIdAsync(parkingAreaId);
        if (parkingArea is null || parkingArea.CampusId != callerCampusId)
            return NotFound("Parking area not found.");

        if (parkingArea.Boundary.Contains(nodeDto.Location))
            return BadRequest("Parking access node cannot be placed inside the parking area.");

        var distance = parkingArea.Boundary.Distance(nodeDto.Location);
        var distanceMeters = GeoHelper.DegreeDistanceToMeters(distance, nodeDto.Location.Y);
        if (distanceMeters > 5)
            return BadRequest($"Parking access node must be within 5 meters of the parking area boundary (currently {distanceMeters:F1}m away).");

        var node = new Node
        {
            Name = nodeDto.Name,
            Location = nodeDto.Location,
            CampusId = callerCampusId,
            ParkingAreaId = parkingAreaId
        };

        await uow.NodeRepository.CreateAsync(node);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to add parking access node.");
        return Ok(node.ToDto());
    }

    [HttpPost]
    public async Task<ActionResult<IReadOnlyList<NodeDto>>> AddNodes(AddNodeDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (dto.Nodes.Count < 2) return BadRequest("At least two nodes are required.");

        var (campusId, _) = await User.GetCampusIdAsync(userManager);

        var points = new List<Point>();
        foreach (var item in dto.Nodes)
        {
            if (item.ExistingNodeId is int existingId)
            {
                var existing = await uow.NodeRepository.GetByIdAsync(existingId);
                if (existing is null) return BadRequest($"Node {existingId} not found.");
                if (existing.CampusId != campusId) return BadRequest($"Node {existingId} does not belong to your campus.");
                points.Add(existing.Location);
            }
            else
            {
                if (item.Location is null) return BadRequest("New path nodes require a location.");
                points.Add(item.Location);
            }
        }

        var buildings = await uow.BuildingRepository.GetByCampusAsync(campusId);
        for (var i = 0; i < points.Count - 1; i++)
        {
            var segment = new LineString(new[] { points[i].Coordinate, points[i + 1].Coordinate });
            if (buildings.Any(b => !b.AllowsPassage && b.Boundary.Intersects(segment)))
                return BadRequest("A path segment crosses a building - adjust the route.");
        }

        var resolvedNodes = new List<Node>();
        foreach (var item in dto.Nodes)
        {
            if (item.ExistingNodeId is int existingId)
            {
                resolvedNodes.Add(await uow.NodeRepository.GetByIdAsync(existingId)
                    ?? throw new InvalidOperationException("Node vanished mid-request."));
            }
            else
            {
                var newNode = new Node { Name = item.Name, Location = item.Location!, CampusId = campusId };
                await uow.NodeRepository.CreateAsync(newNode);
                resolvedNodes.Add(newNode);
            }
        }

        for (var i = 0; i < resolvedNodes.Count - 1; i++)
        {
            double degreeDistance = resolvedNodes[i].Location.Distance(resolvedNodes[i + 1].Location);
            var edge = new Edge
            {
                FromNode = resolvedNodes[i],
                ToNode = resolvedNodes[i + 1],
                CampusId = campusId,
                Weight = (decimal)GeoHelper.DegreeDistanceToMeters(degreeDistance, resolvedNodes[i + 1].Location.Y)
            };
            await uow.EdgeRepository.CreateAsync(edge);
        }

        if (!await uow.CompleteAsync()) return BadRequest("Failed to add nodes.");
        return Ok(resolvedNodes.Select(n => n.ToDto()).ToList());
    }

    [HttpPut("{nodeId:int}/name")]
    public async Task<ActionResult<NodeDto>> RenameNode(int nodeId, [FromBody] RenameDto renameDto)
    {
        var node = await uow.NodeRepository.GetByIdAsync(nodeId);
        if (node is null) return NotFound();

        var (callerCampusId, _) = await User.GetCampusIdAsync(userManager);
        if (node.CampusId != callerCampusId) return NotFound();

        node.Name = renameDto.Name;
        await uow.NodeRepository.UpdateAsync(node);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to rename node.");
        return Ok(node.ToDto());
    }

    [HttpPut("{nodeId:int}/details")]
    public async Task<ActionResult<NodeDto>> UpdateNodeDetails(int nodeId, [FromBody] NodeDetailsDto detailsDto)
    {
        var node = await uow.NodeRepository.GetByIdAsync(nodeId);
        if (node is null) return NotFound();

        var (callerCampusId, _) = await User.GetCampusIdAsync(userManager);
        if (node.CampusId != callerCampusId) return NotFound();

        node.Name = detailsDto.Name;
        if (node.BuildingId is int buildingId)
        {
            var normalizedInterest = EntranceInterestHelper.Normalize(detailsDto.InterestOfEntrance);
            if (!string.Equals(node.InterestOfEntrance, normalizedInterest, StringComparison.Ordinal))
            {
                node.InterestOfEntrance = normalizedInterest;
                await uow.RouteRepository.DeleteByBuildingAsync(buildingId);
            }
        }

        await uow.NodeRepository.UpdateAsync(node);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to update node.");
        return Ok(node.ToDto());
    }

    [HttpDelete("{nodeId:int}")]
    public async Task<ActionResult> DeleteNode(int nodeId)
    {
        var node = await uow.NodeRepository.GetByIdAsync(nodeId);
        if (node is null) return NotFound();

        var (callerCampusId, _) = await User.GetCampusIdAsync(userManager);
        if (node.CampusId != callerCampusId) return NotFound();

        if (node.BuildingId is int buildingId)
            await uow.RouteRepository.DeleteByBuildingAsync(buildingId);

        var edges = await uow.EdgeRepository.GetByNodeAsync(nodeId);
        foreach (var edge in edges)
            await uow.EdgeRepository.DeleteAsync(edge);

        await uow.NodeRepository.DeleteAsync(node);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to delete node.");
        return Ok();
    }
}