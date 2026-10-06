using System.Security.Claims;
using API.DTOs;
using API.Entities;
using API.Interfaces;
using Microsoft.AspNetCore.Identity;

namespace API.Extensions;

public static class AppUserExtensions
{
    public static async Task<UserDto> ToDto(this AppUser user, ITokenService tokenService)
    {
        return new UserDto
        {
            Id = user.Id,
            Email = user.Email!,
            UniversityId = user.CurrentUniversityId ?? user.UniversityId,
            IsVisitor = user.CurrentUniversityId is not null && user.CurrentUniversityId.Value != user.UniversityId,
            CampusId = user.CampusId,
            Token = await tokenService.CreateToken(user)
        };
    }

    public static async Task<int> GetUniversityIdAsync(this ClaimsPrincipal user, UserManager<AppUser> userManager)
    {
        var appUser = await userManager.FindByNameAsync(user.Identity!.Name!);
        return appUser?.UniversityId ?? 0;
    }

    public static async Task<int> GetCurrentUniversityIdAsync(this ClaimsPrincipal user, UserManager<AppUser> userManager)
    {
        var appUser = await userManager.FindByNameAsync(user.Identity!.Name!);
        return appUser?.CurrentUniversityId ?? appUser?.UniversityId ?? 0;
    }

    public static async Task<int> GetActiveUniversityIdAsync(this ClaimsPrincipal user,
         UserManager<AppUser> userManager, bool isStandardUser = false)
    {
        return isStandardUser ? await user.GetCurrentUniversityIdAsync(userManager)
                            : await user.GetUniversityIdAsync(userManager);
    }

    public static async Task<(int, bool)> GetCampusIdAsync(this ClaimsPrincipal user, UserManager<AppUser> userManager)
    {
        var appUser = await userManager.FindByNameAsync(user.Identity!.Name!);
        return (appUser?.CampusId ?? 0, appUser?.CurrentUniversityId != null && appUser?.UniversityId != appUser?.CurrentUniversityId);
    }

    public static async Task<(int CampusId, bool IsGuest)> GetNavigationContextAsync(
        this ClaimsPrincipal user, UserManager<AppUser> userManager, IUnitOfWork uow)
    {
        var appUser = await userManager.FindByNameAsync(user.Identity!.Name!);
        if (appUser is null) return (0, false);

        var campus = await uow.CampusRepository.GetByIdAsync(appUser?.CampusId ?? 0);
        var isGuest = campus is not null && campus.UniversityId != appUser?.UniversityId;

        return (appUser?.CampusId ?? 0, isGuest);
    }
}
