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
        var campusId = await User.GetCampusIdAsync(userManager);
        var edges = await uow.EdgeRepository.GetByCampusAsync(campusId);
        return Ok(edges.Select(e => e.ToDto()));
    }

    [HttpPost]
    public async Task<ActionResult<EdgeDto>> AddEdge(int fromNodeId, int toNodeId)
    {
        if (fromNodeId == toNodeId) return BadRequest("An edge cannot connect a node to itself.");

        var fromNode = await uow.NodeRepository.GetByIdAsync(fromNodeId);
        var toNode = await uow.NodeRepository.GetByIdAsync(toNodeId);
        var campusId = await User.GetCampusIdAsync(userManager);

        if (fromNode is null || toNode is null || fromNode.CampusId != campusId || toNode.CampusId != campusId)
            return BadRequest("One or both nodes not found.");

        var duplicate = await uow.EdgeRepository.GetByNodesAsync(fromNodeId, toNodeId)
            ?? await uow.EdgeRepository.GetByNodesAsync(toNodeId, fromNodeId);
        if (duplicate is not null) return BadRequest("These nodes are already connected.");

        var buildings = await uow.BuildingRepository.GetByCampusAsync(campusId);
        var segment = new LineString(new[] { fromNode.Location.Coordinate, toNode.Location.Coordinate });
        if (buildings.Any(b => b.Boundary.Intersects(segment)))
            return BadRequest("This path crosses a building — adjust the route.");

        var degreeDistance = fromNode.Location.Distance(toNode.Location);

        var edge = new Edge
        {
            FromNodeId = fromNodeId,
            ToNodeId = toNodeId,
            Weight = (decimal)GeoHelper.DegreeDistanceToMeters(degreeDistance, toNode.Location.Y),
            CampusId = campusId
        };

        await uow.EdgeRepository.CreateAsync(edge);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to add edge.");
        return Ok(edge.ToDto());
    }
    
    [HttpPut("{edgeId:int}/name")]
    public async Task<ActionResult<EdgeDto>> RenameEdge(int edgeId, [FromBody] RenameDto renameDto)
    {
        var edge = await uow.EdgeRepository.GetByIdAsync(edgeId);
        if (edge is null) return NotFound();

        var callerCampusId = await User.GetCampusIdAsync(userManager);
        if (edge.CampusId != callerCampusId) return NotFound();

        edge.Name = renameDto.Name;
        await uow.EdgeRepository.UpdateAsync(edge);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to rename path.");
        return Ok(edge.ToDto());
    }

    [HttpDelete("{edgeId:int}")]
    public async Task<ActionResult> DeleteEdge(int edgeId)
    {
        var edge = await uow.EdgeRepository.GetByIdAsync(edgeId);
        if (edge is null) return NotFound();

        await uow.EdgeRepository.DeleteAsync(edge);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to delete edge.");
        return Ok();
    }
}