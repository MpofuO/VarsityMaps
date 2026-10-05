using System.Security.Cryptography;
using System.Text;
using API.DTOs;
using API.Entities;
using API.Extensions;
using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountController(UserManager<AppUser> userManager, IUnitOfWork uow, ITokenService tokenService) : ControllerBase
{
    private static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(7);
    private const string RefreshTokenCookieName = "refreshToken";

    [HttpPost("login")]
    public async Task<ActionResult<UserDto>> Login(LoginDto loginDto)
    {
        if (!ModelState.IsValid)
            return BadRequest();

        var user = await userManager.FindByEmailAsync(loginDto.Email);
        if (user is null || user.IsDeleted || !await userManager.CheckPasswordAsync(user, loginDto.Password))
        {
            return BadRequest("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            var roles = await userManager.GetRolesAsync(user);

            if (roles.Contains("CampusAdmin"))
                return BadRequest("Your account has been suspended by your university administrator.");
            if (roles.Contains("UniversityAdmin"))
                return BadRequest("Your institution's application is still pending approval.");

            return BadRequest("Your account is not active.");
        }

        var refreshResult = await SetRefreshTokenCookie(user);
        if (!refreshResult.Succeeded)
            return Problem(statusCode: StatusCodes.Status500InternalServerError, title: "Could not create a refresh session.");

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

        var (user, isNew) = await GetUserByEmailFromAll(registerDto.Email);
        var wasDeleted = user.IsDeleted;

        if (!isNew && !wasDeleted) return BadRequest("This email is already in use.");

        user.UniversityId = registerDto.UniversityId;
        user.CampusId = registerDto.CampusId;
        user.IsActive = true;
        user.IsDeleted = false;

        if (isNew)
        {
            var createResult = await userManager.CreateAsync(user, registerDto.Password);
            if (!createResult.Succeeded)
            {
                return BadRequest(createResult.Errors);
            }
        }
        else
        {
            var updateResult = await userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                return BadRequest(updateResult.Errors);
            }

            var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await userManager.ResetPasswordAsync(user, resetToken, registerDto.Password);
            if (!resetResult.Succeeded)
            {
                return BadRequest(resetResult.Errors);
            }
        }

        var roleResult = await userManager.AddToRoleAsync(user, "StandardUser");

        if (!roleResult.Succeeded)
        {
            if (isNew) await userManager.DeleteAsync(user);
            return BadRequest(roleResult.Errors);
        }

        var refreshResult = await SetRefreshTokenCookie(user);
        if (!refreshResult.Succeeded)
            return Problem(statusCode: StatusCodes.Status500InternalServerError, title: "Could not create a refresh session.");

        return await user.ToDto(tokenService);
    }

    [HttpGet("email-exists")]
    [AllowAnonymous]
    public async Task<ActionResult<EmailCheckDto>> EmailExists([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return Ok(new EmailCheckDto { Exists = false, PendingInvitationId = null });

        var user = await userManager.FindByEmailAsync(email);
        var pending = await uow.InvitationRepository.GetPendingInvitationByEmailAsync(email);

        return Ok(new EmailCheckDto
        {
            Exists = user is not null,
            PendingInvitationId = pending?.InvitationId
        });
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

        var (user, isNew) = await GetUserByEmailFromAll(invitation.InviteeEmail);
        var wasDeleted = user.IsDeleted;

        if (!isNew && !wasDeleted) return BadRequest("This email is already in use.");

        user.UniversityId = campus.UniversityId;
        user.CampusId = campus.CampusId;
        user.IsActive = true;
        user.IsDeleted = false;

        if (isNew)
        {
            var createResult = await userManager.CreateAsync(user, acceptInvitationDto.Password);
            if (!createResult.Succeeded) return BadRequest(createResult.Errors);
        }
        else
        {
            var updateResult = await userManager.UpdateAsync(user);
            if (!updateResult.Succeeded) return BadRequest(updateResult.Errors);

            var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await userManager.ResetPasswordAsync(user, resetToken, acceptInvitationDto.Password);
            if (!resetResult.Succeeded) return BadRequest(resetResult.Errors);
        }

        var roleResult = await userManager.AddToRoleAsync(user, "CampusAdmin");
        if (!roleResult.Succeeded)
        {
            if (isNew) await userManager.DeleteAsync(user);
            return BadRequest(roleResult.Errors);
        }

        invitation.IsAccepted = true;
        await uow.InvitationRepository.UpdateAsync(invitation);

        if (!await uow.CompleteAsync())
        {
            if (isNew) await userManager.DeleteAsync(user);
            return BadRequest("Failed to accept invitation.");
        }

        var refreshResult = await SetRefreshTokenCookie(user);
        if (!refreshResult.Succeeded)
            return Problem(statusCode: StatusCodes.Status500InternalServerError, title: "Could not create a refresh session.");

        return await user.ToDto(tokenService);
    }

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public async Task<ActionResult<UserDto>> RefreshToken()
    {
        var refreshToken = Request.Cookies[RefreshTokenCookieName];
        if (string.IsNullOrWhiteSpace(refreshToken))
            return NoContent();

        var refreshTokenHash = tokenService.HashRefreshToken(refreshToken);
        var now = DateTime.UtcNow;
        var user = await userManager.Users.FirstOrDefaultAsync(x =>
            x.RefreshTokenHash == refreshTokenHash &&
            x.RefreshTokenExpiry > now &&
            x.IsActive);

        if (user is null)
        {
            DeleteRefreshTokenCookie();
            return NoContent();
        }

        var refreshResult = await SetRefreshTokenCookie(user);
        if (!refreshResult.Succeeded)
            return Problem(statusCode: StatusCodes.Status500InternalServerError, title: "Could not refresh the session.");

        return await user.ToDto(tokenService);
    }

    [HttpGet("my-university")]
    [Authorize]
    public async Task<ActionResult<UniversityDto>> GetMyUniversity()
    {
        var universityId = await User.GetActiveUniversityIdAsync(userManager, User.IsInRole("StandardUser"));
        var university = await uow.UniversityRepository.GetByIdAsync(universityId);
        if (university is null) return NotFound();
        return Ok(university.ToDto());
    }

    [HttpPost("switch-campus")]
    [Authorize(Policy = "RequireStandardUserRole")]
    public async Task<IActionResult> SwitchCampus([FromBody] int campusId)
    {
        var user = await userManager.FindByNameAsync(User?.Identity?.Name!);
        if (user is null) return BadRequest();

        var campus = await uow.CampusRepository.GetByIdAsync(campusId);
        if (campus is null) return BadRequest("Campus not found");

        user.CurrentUniversityId = campus.UniversityId;
        user.CampusId = campusId;
        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded) return BadRequest("Failed to switch campus");

        return Ok(await user.ToDto(tokenService));
    }

    [HttpPost("switch-institution")]
    [Authorize(Policy = "RequireStandardUserRole")]
    public async Task<IActionResult> SwitchInstitution([FromBody] int universityId)
    {
        var user = await userManager.FindByNameAsync(User?.Identity?.Name!);
        if (user is null) return BadRequest();

        var university = await uow.UniversityRepository.GetWithCampusesAsync(universityId);
        if (university is null) return BadRequest("University not found");

        user.CurrentUniversityId = universityId;
        user.CampusId = university.Campuses.FirstOrDefault()?.CampusId;
        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded) return BadRequest("Failed to switch institution");

        return Ok(await user.ToDto(tokenService));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<ActionResult> Logout()
    {
        var refreshToken = Request.Cookies[RefreshTokenCookieName];
        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            var refreshTokenHash = tokenService.HashRefreshToken(refreshToken);
            await userManager.Users
                .Where(x => x.RefreshTokenHash == refreshTokenHash)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.RefreshTokenHash, _ => (string?)null)
                    .SetProperty(x => x.RefreshTokenExpiry, _ => (DateTime?)null));
        }

        DeleteRefreshTokenCookie();
        return Ok();
    }

    private async Task<IdentityResult> SetRefreshTokenCookie(AppUser user)
    {
        var refreshToken = tokenService.GenerateRefreshToken();
        var expires = DateTime.UtcNow.Add(RefreshTokenLifetime);
        user.RefreshTokenHash = tokenService.HashRefreshToken(refreshToken);
        user.RefreshTokenExpiry = expires;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return result;

        Response.Cookies.Append(RefreshTokenCookieName, refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = expires,
            Path = "/api/account"
        });

        return result;
    }

    private void DeleteRefreshTokenCookie()
    {
        Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
        {
            Secure = true,
            SameSite = SameSiteMode.None,
            Path = "/api/account"
        });
    }

    private async Task<(AppUser, bool)> GetUserByEmailFromAll(string email)
    {
        var normalized = userManager.NormalizeEmail(email);
        var user = await userManager.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.NormalizedEmail == normalized);
        if (user is not null)
            return (user, false);
        return (new AppUser
        {
            UserName = email,
            Email = email
        }, true);
    }
}
