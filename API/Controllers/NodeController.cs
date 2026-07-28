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
[Authorize(Policy = "RequireCampusAdminRole")]
public class NodeController(UserManager<AppUser> userManager, IUnitOfWork uow) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<int>> AddNode(NodeDto nodeDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var node = new Node
        {
            Name = nodeDto.Name,
            Location = nodeDto.Location,
            CampusId = await User.GetCampusIdAsync(userManager),
            BuildingId = nodeDto.BuildingId
        };

        await uow.NodeRepository.CreateAsync(node);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to add node.");
        return Ok(node.NodeId);
    }

    [HttpDelete("{nodeId:int}")]
    public async Task<ActionResult> DeleteNode(int nodeId)
    {
        var node = await uow.NodeRepository.GetByIdAsync(nodeId);
        if (node is null) return NotFound();

        var edges = await uow.EdgeRepository.GetByNodeAsync(nodeId);
        foreach (var edge in edges)
            await uow.EdgeRepository.DeleteAsync(edge);

        await uow.NodeRepository.DeleteAsync(node);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to delete node.");
        return Ok();
    }
}
