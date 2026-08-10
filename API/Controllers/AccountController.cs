using System.Security.Cryptography;
using System.Text;
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
public class AccountController(UserManager<AppUser> userManager, IUnitOfWork uow, ITokenService tokenService) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<UserDto>> Login(LoginDto loginDto)
    {
        if (!ModelState.IsValid)
            return BadRequest();

        var user = await userManager.FindByEmailAsync(loginDto.Email);
        if (user is null || !await userManager.CheckPasswordAsync(user, loginDto.Password))
        {
            return BadRequest("Invalid email or password.");
        }

        if (!user.IsActive)
            return BadRequest("Account not yet active");

        return await user.ToDto(tokenService);
    }

    [HttpPost("register")]
    public async Task<ActionResult<UserDto>> Register(RegisterDto registerDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var university = await uow.UniversityRepository.GetByIdAsync(registerDto.UniversityId);
        if (university is null)
        {
            return BadRequest("Invalid UniversityId.");
        }

        var campus = await uow.CampusRepository.GetByIdAsync(registerDto.CampusId);
        if (campus is null || campus.UniversityId != registerDto.UniversityId)
        {
            return BadRequest("Invalid CampusId for the selected university.");
        }

        var user = new AppUser
        {
            UserName = registerDto.Email,
            Email = registerDto.Email,
            UniversityId = registerDto.UniversityId,
            CampusId = registerDto.CampusId,
            IsActive = true
        };

        var result = await userManager.CreateAsync(user, registerDto.Password);
        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        var roleResult = await userManager.AddToRoleAsync(user, "StandardUser");

        if (!roleResult.Succeeded)
        {
            await userManager.DeleteAsync(user);
            return BadRequest(roleResult.Errors);
        }

        return await user.ToDto(tokenService);
    }

    [HttpPost("accept-invitation/{invitationId}")]
    public async Task<ActionResult<UserDto>> AcceptInvitation(int invitationId, AcceptInvitationDto acceptInvitationDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var invitation = await uow.InvitationRepository.GetByIdAsync(invitationId);
        if (invitation is null) return BadRequest("Invitation not found.");
        if (invitation.IsRevoked) return BadRequest("Invitation has been revoked.");
        if (invitation.IsAccepted) return BadRequest("Invitation has already been accepted.");
        if (invitation.DateCreated.AddDays(invitation.Duration) < DateTime.UtcNow) return BadRequest("Invitation has expired.");
        if (invitation.FailedPassAttempts >= 3) return BadRequest("Invitation is locked due to too many failed PIN attempts.");

        using var hmac = new HMACSHA512(invitation.PasswordSalt);
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(acceptInvitationDto.Pin));

        if (!computedHash.SequenceEqual(invitation.PasswordHash))
        {
            invitation.FailedPassAttempts++;
            await uow.InvitationRepository.UpdateAsync(invitation);
            await uow.CompleteAsync();
            var remaining = Math.Max(3 - invitation.FailedPassAttempts, 0);
            return BadRequest($"Invalid PIN. {remaining} attempt(s) remaining.");
        }

        var campus = await uow.CampusRepository.GetByIdAsync(invitation.CampusId);
        if (campus is null) return BadRequest("Associated campus not found.");

        var user = new AppUser
        {
            UserName = invitation.InviteeEmail,
            Email = invitation.InviteeEmail,
            UniversityId = campus.UniversityId,
            CampusId = invitation.CampusId,
            IsActive = true
        };

        var createResult = await userManager.CreateAsync(user, acceptInvitationDto.Password);
        if (!createResult.Succeeded) return BadRequest(createResult.Errors);

        var roleResult = await userManager.AddToRoleAsync(user, "CampusAdmin");
        if (!roleResult.Succeeded)
        {
            await userManager.DeleteAsync(user);
            return BadRequest(roleResult.Errors);
        }

        invitation.IsAccepted = true;
        await uow.InvitationRepository.UpdateAsync(invitation);

        if (!await uow.CompleteAsync())
        {
            await userManager.DeleteAsync(user);
            return BadRequest("Failed to accept invitation.");
        }

        return await user.ToDto(tokenService);
    }

    [HttpGet("my-university")]
    [Authorize]
    public async Task<ActionResult<UniversityDto>> GetMyUniversity()
    {
        var universityId = await User.GetUniversityIdAsync(userManager);
        var university = await uow.UniversityRepository.GetByIdAsync(universityId);
        if (university is null) return NotFound();
        return Ok(university.ToDto());
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult> Logout()
    {
        return Ok();
    }
}
