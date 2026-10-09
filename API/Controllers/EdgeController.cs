using API.DTOs;
using API.Entities;
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
[Authorize(Policy = "RequireCampusAdminRole")]
public class EdgeController(UserManager<AppUser> userManager, IUnitOfWork uow) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<EdgeDto>>> GetEdges()
    {
        var (campusId, _) = await User.GetCampusIdAsync(userManager);
        var edges = await uow.EdgeRepository.GetByCampusAsync(campusId);
        return Ok(edges.Select(e => e.ToDto()));
    }

    [HttpPost]
    public async Task<ActionResult<EdgeDto>> AddEdge(int fromNodeId, int toNodeId)
    {
        if (fromNodeId == toNodeId) return BadRequest("An edge cannot connect a node to itself.");

        var fromNode = await uow.NodeRepository.GetByIdAsync(fromNodeId);
        var toNode = await uow.NodeRepository.GetByIdAsync(toNodeId);
        var (campusId, _) = await User.GetCampusIdAsync(userManager);

        if (fromNode is null || toNode is null || fromNode.CampusId != campusId || toNode.CampusId != campusId)
            return BadRequest("One or both nodes not found.");

        var duplicate = await uow.EdgeRepository.GetByNodesAsync(fromNodeId, toNodeId)
            ?? await uow.EdgeRepository.GetByNodesAsync(toNodeId, fromNodeId);
        if (duplicate is not null) return BadRequest("These nodes are already connected.");

        var segment = new LineString(new[] { fromNode.Location.Coordinate, toNode.Location.Coordinate });

        // Only block edges that intersect buildings which DO NOT allow passage.
        // Buildings with AllowsPassage = true and all ParkingAreas are allowed.
        var buildings = await uow.BuildingRepository.GetByCampusAsync(campusId);
        var blockingBuildings = buildings
            .Where(building => !building.AllowsPassage && building.Boundary.Intersects(segment))
            .Select(building => new
            {
                building.BuildingId,
                building.Name,
                building.Alias
            })
            .ToList();
        if (blockingBuildings.Count > 0)
        {
            return Conflict(new
            {
                code = "path-building-conflict",
                buildings = blockingBuildings
            });
        }

        var degreeDistance = fromNode.Location.Distance(toNode.Location);

        var edge = new Edge
        {
            FromNodeId = fromNodeId,
            ToNodeId = toNodeId,
            Weight = (decimal)GeoHelper.DegreeDistanceToMeters(degreeDistance, toNode.Location.Y),
            CampusId = campusId
        };

        await uow.EdgeRepository.CreateAsync(edge);
        await uow.RouteRepository.DeleteByCampusAsync(campusId);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to add edge.");
        return Ok(edge.ToDto());
    }

    [HttpPut("{edgeId:int}")]
    public async Task<ActionResult<EdgeDto>> UpdateEdge(int edgeId, EdgePropertiesDto dto)
    {
        var edge = await uow.EdgeRepository.GetByIdAsync(edgeId);
        if (edge is null) return BadRequest("Path not found.");

        var (callerCampusId, _) = await User.GetCampusIdAsync(userManager);
        if (edge.CampusId != callerCampusId) return BadRequest("Path not found.");

        edge.Name = dto.Name;
        edge.IsClosed = dto.IsClosed;
        edge.ClosedUntil = dto.IsClosed ? dto.ClosedUntil : null;
        edge.TravelModes = dto.TravelModes;

        await uow.EdgeRepository.UpdateAsync(edge);
        await uow.RouteRepository.DeleteByCampusAsync(callerCampusId);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to update path.");
        return Ok(edge.ToDto());
    }

    [HttpPut("bulk")]
    public async Task<ActionResult<IEnumerable<EdgeDto>>> BulkUpdate(BulkEdgeUpdateDto dto)
    {
        if (dto.EdgeIds.Count == 0) return BadRequest("No paths selected.");

        var (campusId, _) = await User.GetCampusIdAsync(userManager);
        var edges = new List<Edge>();

        foreach (var id in dto.EdgeIds)
        {
            var edge = await uow.EdgeRepository.GetByIdAsync(id);
            if (edge is null || edge.CampusId != campusId) return BadRequest($"Path {id} not found on your campus.");
            edges.Add(edge);
        }

        foreach (var edge in edges)
        {
            edge.IsClosed = dto.IsClosed;
            edge.ClosedUntil = dto.IsClosed ? dto.ClosedUntil : null;
            edge.TravelModes = dto.TravelModes;
            await uow.EdgeRepository.UpdateAsync(edge);
        }

        await uow.RouteRepository.DeleteByCampusAsync(campusId);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to update paths.");
        return Ok(edges.Select(e => e.ToDto()));
    }

    [HttpDelete("{edgeId:int}")]
    public async Task<ActionResult> DeleteEdge(int edgeId)
    {
        var edge = await uow.EdgeRepository.GetByIdAsync(edgeId);
        if (edge is null) return BadRequest("Edge not found.");

        await uow.EdgeRepository.DeleteAsync(edge);
        await uow.RouteRepository.DeleteByCampusAsync(edge.CampusId);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to delete edge.");
        return Ok();
    }
}