using API.DTOs;
using API.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UniversityController : ControllerBase
{
    private readonly IUnitOfWork _uow;

    public UniversityController(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<ActionResult<IEnumerable<UniversityDto>>> GetAll()
    {
        return Ok(Array.Empty<UniversityDto>());
    }

    public async Task<ActionResult<UniversityDto>> GetById(int id)
    {
        return Ok(new UniversityDto());
    }
}
