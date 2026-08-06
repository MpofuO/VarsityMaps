using API.Entities;
using API.Extensions;
using API.Helpers;
using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

// EdgeController.cs
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireCampusAdminRole")]
public class EdgeController(UserManager<AppUser> userManager, IUnitOfWork uow) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult> AddEdge(int fromNodeId, int toNodeId)
    {
        if (fromNodeId == toNodeId) return BadRequest("An edge cannot connect a node to itself.");

        var fromNode = await uow.NodeRepository.GetByIdAsync(fromNodeId);
        var toNode = await uow.NodeRepository.GetByIdAsync(toNodeId);
        var campusId = await User.GetCampusIdAsync(userManager);

        if (fromNode is null || toNode is null || fromNode.CampusId != campusId || toNode.CampusId != campusId)
            return BadRequest("One or both nodes not found.");

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
        return Ok(edge.EdgeId);
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
