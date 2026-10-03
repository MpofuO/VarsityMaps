using System.Text.Json;
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
[Authorize(Policy = "RequireSystemAdminRole")]
public class UniversityController(UserManager<AppUser> userManager, IUnitOfWork uow, IMailService mailService) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<UniversityDto>>> GetUniversities()
    {
        var universities = await uow.UniversityRepository.GetAllWithCampuses();
        var admins = await userManager.GetUsersInRoleAsync("UniversityAdmin");
        var adminEmails = admins
            .Where(admin => admin.IsActive && !admin.IsDeleted && !string.IsNullOrWhiteSpace(admin.Email))
            .GroupBy(admin => admin.UniversityId)
            .ToDictionary(group => group.Key, group => group.First().Email);

        var universityDtos = universities.OrderBy(u => u.Name).Select(university =>
        {
            var dto = university.ToDto();
            adminEmails.TryGetValue(university.UniversityId, out var adminEmail);
            dto.AdminEmail = adminEmail;
            return dto;
        });

        return Ok(universityDtos);
    }

    [HttpGet("{universityId:int}/campuses")]
    [AllowAnonymous]
    public async Task<ActionResult<UniversityDto>> GetCampuses(int universityId)
    {
        var campuses = await uow.CampusRepository.GetByUniversityAsync(universityId);
        if (campuses is null || !campuses.Any())
            return NotFound("No campuses found for the specified university.");
        return Ok(campuses.OrderBy(c => c.Name).Select(c => c.ToDto()));
    }

    [HttpGet("applications")]
    public async Task<ActionResult<IEnumerable<ApplicationDto>>> GetApplications()
    {
        var applications = await uow.ApplicationRepository.GetAllAsync();
        return Ok(applications.Select(a => a.ToDto()));
    }

    [HttpGet("applications/{id:int}")]
    public async Task<ActionResult<ApplicationDto>> GetApplication(int id)
    {
        var application = await uow.ApplicationRepository.GetByIdAsync(id);
        if (application is null)
        {
            return BadRequest("Application could not be found.");
        }

        return Ok(application.ToDto());
    }

    [HttpPost("applications")]
    [AllowAnonymous]
    public async Task<ActionResult> Apply(ApplyDto applyDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var existingUser = await userManager.FindByEmailAsync(applyDto.Email);
        if (existingUser is not null) return BadRequest("An account with this email already exists.");

        var existingUniversity = await uow.UniversityRepository.GetByNameAsync(applyDto.UniversityName);
        if (existingUniversity is not null) return BadRequest("A university with this name already exists.");
        existingUniversity = await uow.UniversityRepository.GetByAliasAsync(applyDto.UniversityAlias);
        if (existingUniversity is not null) return BadRequest("A university with this alias already exists.");

        var existingApplication = await uow.ApplicationRepository.GetByNameAsync(applyDto.UniversityName);
        if (existingApplication is not null) return BadRequest("A pending application with this name already exists.");
        existingApplication = await uow.ApplicationRepository.GetByAliasAsync(applyDto.UniversityAlias);
        if (existingApplication is not null) return BadRequest("A pending application with this alias already exists.");

        var user = new AppUser
        {
            UserName = applyDto.Email,
            Email = applyDto.Email,
            IsActive = false
        };

        var createResult = await userManager.CreateAsync(user, applyDto.Password);
        if (!createResult.Succeeded) return BadRequest(createResult.Errors);

        var application = new Application
        {
            UserId = user.Id,
            UniversityName = applyDto.UniversityName,
            UniversityAlias = applyDto.UniversityAlias,
            DateCreated = DateTime.UtcNow
        };

        await uow.ApplicationRepository.CreateAsync(application);

        if (!await uow.CompleteAsync())
        {
            await userManager.DeleteAsync(user);
            return BadRequest("Failed to submit application.");
        }

        return Ok();
    }

    [HttpPut("applications/{id:int}")]
    public async Task<ActionResult> Adjudicate(int id, [FromQuery] bool isApproved, [FromBody] string? reason)
    {
        var application = await uow.ApplicationRepository.GetByIdAsync(id);
        if (application is null) return NotFound("Application not found.");

        var user = await userManager.FindByIdAsync(application.UserId);
        if (user is null) return BadRequest("Applicant account not found.");

        application.IsApproved = isApproved;
        application.DecisionReason = reason ?? "";
        await uow.ApplicationRepository.UpdateAsync(application);

        if (!isApproved)
        {
            if (!await uow.CompleteAsync()) return BadRequest("Failed to complete the operation.");
            return Ok();
        }

        var university = new University
        {
            Name = application.UniversityName,
            Alias = application.UniversityAlias
        };
        await uow.UniversityRepository.CreateAsync(university);

        if (!await uow.CompleteAsync())
            return BadRequest("Failed to complete the operation.");

        user.UniversityId = university.UniversityId;
        user.IsActive = true;
        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded) return BadRequest(updateResult.Errors);

        var roleResult = await userManager.AddToRoleAsync(user, "UniversityAdmin");
        if (!roleResult.Succeeded) return BadRequest(roleResult.Errors);

        try
        {
            await mailService.SendApplicationApprovedAsync(user.Email!, university.Name);
        }
        catch { }

        return Ok();
    }
}
