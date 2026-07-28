using System.Security.Cryptography;
using System.Text;
using API.DTOs;
using API.Entities;
using API.Extensions;
using API.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvitationController(IUnitOfWork uow, IMailService mailService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<InvitationDto>>> GetAll()
    {
        var invitations = await uow.InvitationRepository.GetAllWithDetailsAsync();
        return Ok(invitations.Select(i => i.ToDto()));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<InvitationDto>> Get(int id)
    {
        var invitation = await uow.InvitationRepository.GetByIdAsync(id);
        if (invitation is null) return NotFound();
        return Ok(invitation.ToDto());
    }

    [HttpPost]
    public async Task<ActionResult<InvitationDto>> Create(CreateInvitationDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

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

        await mailService.SendInvitationPinAsync(invitation.InviteeEmail, invitation.InviteeName, pin);
        return Ok(invitation.ToDto());
    }

    [HttpPost("{id:int}/reset-pin")]
    public async Task<ActionResult<InvitationDto>> ResetPin(int id)
    {
        var invitation = await uow.InvitationRepository.GetByIdAsync(id);
        if (invitation is null) return NotFound();
        if (invitation.IsAccepted) return BadRequest("Cannot reset PIN for an accepted invitation.");
        if (invitation.IsRevoked) return BadRequest("Cannot reset PIN for a revoked invitation.");

        var (pin, hash, salt) = GeneratePin();
        invitation.PasswordHash = hash;
        invitation.PasswordSalt = salt;
        invitation.FailedPassAttempts = 0;

        await uow.InvitationRepository.UpdateAsync(invitation);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to reset PIN.");

        await mailService.SendInvitationPinAsync(invitation.InviteeEmail, invitation.InviteeName, pin);
        return Ok(invitation.ToDto());
    }

    [HttpPost("{id:int}/resend")]
    public async Task<ActionResult<InvitationDto>> Resend(int id)
    {
        var invitation = await uow.InvitationRepository.GetByIdAsync(id);
        if (invitation is null) return NotFound();
        if (invitation.IsAccepted) return BadRequest("Cannot resend an accepted invitation.");
        if (invitation.IsRevoked) return BadRequest("Cannot resend a revoked invitation.");

        invitation.DateCreated = DateTime.UtcNow;

        await uow.InvitationRepository.UpdateAsync(invitation);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to resend invitation.");

        await mailService.SendInvitationReminderAsync(invitation.InviteeEmail, invitation.InviteeName);
        return Ok(invitation.ToDto());
    }

    [HttpPost("{id:int}/revoke")]
    public async Task<ActionResult<InvitationDto>> Revoke(int id)
    {
        var invitation = await uow.InvitationRepository.GetByIdAsync(id);
        if (invitation is null) return NotFound();
        if (invitation.IsAccepted) return BadRequest("Cannot revoke an accepted invitation.");

        invitation.IsRevoked = true;
        await uow.InvitationRepository.UpdateAsync(invitation);
        if (!await uow.CompleteAsync()) return BadRequest("Failed to revoke invitation.");

        return Ok(invitation.ToDto());
    }

    private static (string pin, byte[] hash, byte[] salt) GeneratePin()
    {
        var pin = Random.Shared.Next(0, 1000000).ToString("D6");
        using var hmac = new HMACSHA512();
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(pin));
        return (pin, hash, hmac.Key);
    }
}
