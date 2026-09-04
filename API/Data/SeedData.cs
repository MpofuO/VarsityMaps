using API.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite;
using NetTopologySuite.Geometries;

namespace API.Data;

public static class SeedData
{
    private static readonly string[] Roles =
        { "SystemAdmin", "UniversityAdmin", "CampusAdmin", "StandardUser" };

    private static readonly GeometryFactory GeometryFactory =
        NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

    public static async Task SeedAsync(AppDbContext context, RoleManager<IdentityRole> roleManager, UserManager<AppUser> userManager)
    {
        foreach (var role in Roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        var ufs = await GetOrCreateUniversityAsync(context, "University of the Free State", "UFS");
        var ufsCampuses = await GetOrCreateCampusesAsync(context, ufs, new[]
        {
            ("Bloemfontein Campus", "BFN", 26.1929, -29.1084),
            ("Qwaqwa Campus", "QWA", 28.7906, -28.5106),
            ("South Campus", "SC", 26.2145, -29.1204)
        });

        var uct = await GetOrCreateUniversityAsync(context, "University of Cape Town", "UCT");
        var uctCampuses = await GetOrCreateCampusesAsync(context, uct, new[]
        {
            ("Upper Campus", "UPP", 18.4612, -33.9578),
            ("Hiddingh Campus", "HID", 18.4172, -33.9249)
        });

        var ru = await GetOrCreateUniversityAsync(context, "Rhodes University", "RU");
        var ruCampuses = await GetOrCreateCampusesAsync(context, ru, new[]
        {
            ("Grahamstown Campus", "GTN", 26.5225, -33.3110)
        });

        await SeedUserAsync(userManager, "sysadmin@vmaps.com", "Pass@123",
            "SystemAdmin", universityId: 0, campusId: null);

        await SeedUserAsync(userManager, "uniadmin.ufs@vmaps.com", "Pass@123",
            "UniversityAdmin", ufs.UniversityId, campusId: null);
        await SeedUserAsync(userManager, "campusadmin.bfn@vmaps.com", "Pass@123",
            "CampusAdmin", ufs.UniversityId, ufsCampuses[0].CampusId);
        await SeedUserAsync(userManager, "standard.ufs@vmaps.com", "Pass@123",
            "StandardUser", ufs.UniversityId, ufsCampuses[0].CampusId);

        await SeedUserAsync(userManager, "uniadmin.uct@vmaps.com", "Pass@123",
            "UniversityAdmin", uct.UniversityId, campusId: null);
        await SeedUserAsync(userManager, "campusadmin.upper@vmaps.com", "Pass@123",
            "CampusAdmin", uct.UniversityId, uctCampuses[0].CampusId);
        await SeedUserAsync(userManager, "standard.uct@vmaps.com", "Pass@123",
            "StandardUser", uct.UniversityId, uctCampuses[0].CampusId);

        await SeedUserAsync(userManager, "uniadmin.ru@vmaps.com", "Pass@123",
            "UniversityAdmin", ru.UniversityId, campusId: null);
        await SeedUserAsync(userManager, "campusadmin.gtown@vmaps.com", "Pass@123",
            "CampusAdmin", ru.UniversityId, ruCampuses[0].CampusId);
        await SeedUserAsync(userManager, "standard.ru@vmaps.com", "Pass@123",
            "StandardUser", ru.UniversityId, ruCampuses[0].CampusId);
    }

    private static async Task<University> GetOrCreateUniversityAsync(AppDbContext context, string name, string alias)
    {
        var existing = await context.Universities.FirstOrDefaultAsync(u => u.Alias == alias);
        if (existing is not null) return existing;

        var university = new University { Name = name, Alias = alias };
        context.Universities.Add(university);
        await context.SaveChangesAsync();
        return university;
    }

    private static async Task<List<Campus>> GetOrCreateCampusesAsync(
        AppDbContext context, University university, (string Name, string Alias, double Lng, double Lat)[] campusData)
    {
        var result = new List<Campus>();

        foreach (var (name, alias, lng, lat) in campusData)
        {
            var existing = await context.Campuses.FirstOrDefaultAsync(c => c.Alias == alias);
            if (existing is not null)
            {
                result.Add(existing);
                continue;
            }

            var campus = new Campus
            {
                Name = name,
                Alias = alias,
                Center = GeometryFactory.CreatePoint(new Coordinate(lng, lat)),
                University = university
            };
            context.Campuses.Add(campus);
            result.Add(campus);
        }

        await context.SaveChangesAsync();
        return result;
    }

    private static async Task SeedUserAsync(
        UserManager<AppUser> userManager, string email, string password,
        string role, int universityId, int? campusId)
    {
        if (await userManager.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(user=>user.Email!.ToLower() == email.ToUpper())
                is not null)
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