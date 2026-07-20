using API.DTOs;
using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly IUnitOfWork _uow;

    public AdminController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<ActionResult<IEnumerable<ApplicationDto>>> GetApplications()
    {
        return Ok(Array.Empty<ApplicationDto>());
    }
}
