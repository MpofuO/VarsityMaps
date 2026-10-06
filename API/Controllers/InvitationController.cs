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
[Authorize(Policy = "RequireUniversityAdminRole")]
public class InvitationController(UserManager<AppUser> userManager, IUnitOfWork uow, IMailService mailService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<InvitationDto>>> GetAll()
    {
        var universityId = await User.GetUniversityIdAsync(userManager);
        var invitations = await uow.InvitationRepository.GetAllWithDetailsAsync(universityId);
        return Ok(invitations.OrderByDescending(i => i.DateCreated).Select(i => i.ToDto()));
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<InvitationDto>> Get(int id)
    {
        var invitation = await uow.InvitationRepository.GetWithDetailsAsync(id);
        if (invitation is null) return BadRequest("Invitation not found.");
        return Ok(invitation.ToDto());
    }

    [HttpGet("campus/{campusId:int}/pending")]
    public async Task<ActionResult<int>> GetPendingInvitationId(int campusId)
    {
        var campus = await uow.CampusRepository.GetByIdAsync(campusId);
        if (campus is null) return BadRequest("Campus not found.");

        var universityId = await User.GetUniversityIdAsync(userManager);
        if (campus.UniversityId != universityId) return BadRequest("Campus not found.");

        var pending = await uow.InvitationRepository.GetPendingInvitationAsync(campusId);
        return Ok(pending?.InvitationId ?? 0);
    }

    [HttpPost]
    public async Task<ActionResult<InvitationDto>> Create(CreateInvitationDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var campusAdmins = await userManager.GetUsersInRoleAsync("CampusAdmin");
        if (campusAdmins.Any(admin => admin.CampusId == dto.CampusId && admin.IsActive))
            return BadRequest("This campus already has an assigned campus admin");

        var existingForEmail = await uow.InvitationRepository.GetPendingInvitationByEmailAsync(dto.InviteeEmail);
        if (existingForEmail is not null)
        {
            if (existingForEmail.CampusId == dto.CampusId)
                return BadRequest("This campus already has a pending invitation.");
            return BadRequest($"This email already has a pending invitation to {existingForEmail.Campus?.Name ?? "another campus"}.");
        }

        var campus = await uow.CampusRepository.GetByIdAsync(dto.CampusId);
        if (campus is null) return BadRequest("Please enter a valid campus");

        var pending = await uow.InvitationRepository.GetPendingInvitationAsync(dto.CampusId);
        if (pending is not null)
            return BadRequest("This campus already has a pending invitation.");

        var (pin, hash, salt) = GeneratePin();
        var invitation = new Invitation
        {
            InviteeEmail = dto.InviteeEmail,
            InviteeName = dto.InviteeName,
            CampusId = dto.CampusId,
            Duration = dto.Duration,
            PasswordHash = hash,
            PasswordSalt = salt,
            DateCreated = DateTime.UtcNow
        };

        await uow.InvitationRepository.CreateAsync(invitation);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to create invitation.");

        await mailService.SendInvitationPinAsync(
                invitation.InviteeEmail, invitation.InviteeName,
                pin, invitation.InvitationId);
        return Ok(invitation.ToDto());
    }

    [HttpPut("{id:int}/duration")]
    public async Task<ActionResult<InvitationDto>> UpdateDuration(int id, [FromBody] int duration)
    {
        var invitation = await uow.InvitationRepository.GetByIdAsync(id);
        if (invitation is null) return BadRequest("Invitation not found.");
        if (invitation.IsAccepted) return BadRequest("Cannot update an accepted invitation.");
        if (invitation.IsRevoked) return BadRequest("Cannot update a revoked invitation.");

        var pending = await uow.InvitationRepository.GetPendingInvitationAsync(invitation.CampusId);
        if (pending is not null && pending.InvitationId != invitation.InvitationId)
            return BadRequest("This campus already has a pending invitation.");

        if (duration < invitation.Duration) return BadRequest("Duration can only be increased.");
        
        invitation.Duration = duration;
        await uow.InvitationRepository.UpdateAsync(invitation);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to update invitation.");
        return Ok(invitation.ToDto());
    }

    [HttpPost("{id:int}/reset-pin")]
    public async Task<ActionResult<InvitationDto>> ResetPin(int id)
    {
        var invitation = await uow.InvitationRepository.GetByIdAsync(id);
        if (invitation is null) return BadRequest("Invitation not found.");
        if (invitation.IsAccepted) return BadRequest("Cannot reset PIN for an accepted invitation.");
        if (invitation.IsRevoked) return BadRequest("Cannot reset PIN for a revoked invitation.");

        var pending = await uow.InvitationRepository.GetPendingInvitationAsync(invitation.CampusId);
        if (pending is not null && pending.InvitationId != invitation.InvitationId)
            return BadRequest("This campus already has a pending invitation.");

        var (pin, hash, salt) = GeneratePin();
        invitation.PasswordHash = hash;
        invitation.PasswordSalt = salt;
        invitation.FailedPassAttempts = 0;
        invitation.DateCreated = DateTime.UtcNow;

        await uow.InvitationRepository.UpdateAsync(invitation);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to reset PIN.");

        await mailService.SendInvitationPinAsync(
                invitation.InviteeEmail, invitation.InviteeName,
                pin, invitation.InvitationId);
        return Ok(invitation.ToDto());
    }

    [HttpPost("{id:int}/resend")]
    public async Task<ActionResult<InvitationDto>> Resend(int id)
    {
        var invitation = await uow.InvitationRepository.GetByIdAsync(id);
        if (invitation is null) return BadRequest("Invitation not found.");
        if (invitation.IsAccepted) return BadRequest("Cannot resend an accepted invitation.");
        if (invitation.IsRevoked) return BadRequest("Cannot resend a revoked invitation.");

        var pending = await uow.InvitationRepository.GetPendingInvitationAsync(invitation.CampusId);
        if (pending is not null && pending.InvitationId != invitation.InvitationId)
            return BadRequest("This campus already has a pending invitation.");

        invitation.DateCreated = DateTime.UtcNow;
        invitation.Duration = Math.Min(invitation.Duration, 7);

        await uow.InvitationRepository.UpdateAsync(invitation);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to resend invitation.");

        await mailService.SendInvitationReminderAsync(
            invitation.InviteeEmail,
            invitation.InviteeName,
            invitation.InvitationId);
        return Ok(invitation.ToDto());
    }

    [HttpPost("{id:int}/revoke")]
    public async Task<ActionResult<InvitationDto>> Revoke(int id)
    {
        var invitation = await uow.InvitationRepository.GetByIdAsync(id);
        if (invitation is null) return BadRequest("Invitation not found.");
        if (invitation.IsAccepted) return BadRequest("Cannot revoke an accepted invitation.");

        invitation.IsRevoked = true;
        await uow.InvitationRepository.UpdateAsync(invitation);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to revoke invitation.");

        return Ok(invitation.ToDto());
    }

    [HttpPost("{id:int}/reject")]
    [AllowAnonymous]
    public async Task<ActionResult> Reject(int id)
    {
        var invitation = await uow.InvitationRepository.GetByIdAsync(id);
        if (invitation is null) return BadRequest("Invitation not found.");
        if (invitation.IsAccepted) return BadRequest("This invitation has already been accepted.");
        if (invitation.IsRevoked) return BadRequest("This invitation has already been revoked.");

        invitation.IsRejected = true;
        await uow.InvitationRepository.UpdateAsync(invitation);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to decline invitation.");
        return Ok();
    }

    private static (string pin, byte[] hash, byte[] salt) GeneratePin()
    {
        var pin = Random.Shared.Next(0, 1000000).ToString("D6");
        using var hmac = new HMACSHA512();
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(pin));
        return (pin, hash, hmac.Key);
    }
}
