using API.DTOs;
using API.Entities;
using API.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly IUnitOfWork _uow;

    public AccountController(UserManager<AppUser> userManager, IUnitOfWork uow)
    {
        _userManager = userManager;
        _uow = uow;
    }

    public Task<ActionResult<UserDto>> Login(LoginDto loginDto)
    {
        return Task.FromResult<ActionResult<UserDto>>(Unauthorized());
    }

    public Task<ActionResult<UserDto>> Register(RegisterDto registerDto)
    {
        return Task.FromResult<ActionResult<UserDto>>(BadRequest());
    }
}
