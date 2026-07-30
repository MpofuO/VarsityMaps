using System;
using API.Entities;
using Microsoft.AspNetCore.Identity;

namespace API.Data;

public static class SeedData
{
    private static readonly string[] Roles =
        { "SystemAdmin", "UniversityAdmin", "CampusAdmin", "StandardUser" };

    public static async Task SeedAsync(RoleManager<IdentityRole> roleManager, UserManager<AppUser> userManager)
    {
        foreach (var role in Roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        await SeedUserAsync(userManager, "sysadmin@vmaps.com", "Pass@123",
            "SystemAdmin", universityId: 0, campusId: null);

        await SeedUserAsync(userManager, "uniadmin@vmaps.com", "Pass@123",
            "UniversityAdmin", universityId: 1, campusId: null);

        await SeedUserAsync(userManager, "campusadmin@vmaps.com", "Pass@123",
            "CampusAdmin", universityId: 1, campusId: 1);

        await SeedUserAsync(userManager, "standard@vmaps.com", "Pass@123",
            "StandardUser", universityId: 1, campusId: 1);
    }

    private static async Task SeedUserAsync(
        UserManager<AppUser> userManager, string email, string password,
        string role, int universityId, int? campusId)
    {
        if (await userManager.FindByEmailAsync(email) is not null)
            return;

        var user = new AppUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            IsActive = true,
            UniversityId = universityId,
            CampusId = campusId
        };

        var result = await userManager.CreateAsync(user, password);
        if (result.Succeeded)
            await userManager.AddToRoleAsync(user, role);
    }
}
