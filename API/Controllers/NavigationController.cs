using API.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NavigationController : ControllerBase
{
    private readonly IUnitOfWork _uow;

    public NavigationController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<ActionResult> GetRoute([FromQuery] int fromNodeId, [FromQuery] int toNodeId)
    {
        return Ok();
    }
}
