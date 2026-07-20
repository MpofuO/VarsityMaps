using API.DTOs;
using API.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CampusController : ControllerBase
{
    private readonly IUnitOfWork _uow;

    public CampusController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<ActionResult<IEnumerable<CampusDto>>> GetAll()
    {
        return Ok(Array.Empty<CampusDto>());
    }

    public async Task<ActionResult<CampusDto>> GetById(int id)
    {
        return Ok(new CampusDto());
    }
}
