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
        await SeedUniversityLookupsAsync(context);

        // 2. Seed Identity Roles if none exist
        if (!await roleManager.Roles.AnyAsync())
        {
            foreach (var role in Roles)
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        if (!await context.Universities.AnyAsync())
        {
            var ufs = await GetOrCreateUniversityAsync(context, "University of the Free State", "UFS");
            var ufsCampuses = await GetOrCreateCampusesAsync(context, ufs, new[]
            {
                ("Bloemfontein Campus", "BFN", 26.186551964831427, -29.110679111224844),
                ("Qwaqwa Campus", "QWA", 28.824826842929767, -28.485617112378254),
                ("South Campus", "SC", 26.215961433775213, -29.1829977986486), 
            });

            var uct = await GetOrCreateUniversityAsync(context, "University of Cape Town", "UCT");
            var uctCampuses = await GetOrCreateCampusesAsync(context, uct, new[]
            {
                ("Upper Campus", "UPP", 18.4612, -33.9578),
                ("Hiddingh Campus", "HID", 18.4172, -33.9249),
            });

            var ru = await GetOrCreateUniversityAsync(context, "Rhodes University", "RU");
            var ruCampuses = await GetOrCreateCampusesAsync(context, ru, new[]
            {
                ("Grahamstown Campus", "GTN", 26.52072490284499, -33.313311480526714) 
            });

            if (!await userManager.Users.IgnoreQueryFilters().AnyAsync())
            {
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
        }
    }

    private static async Task SeedUniversityLookupsAsync(AppDbContext context)
    {
        // Skip lookup insertion if the table already contains entries
        if (await context.UniversityLookups.AnyAsync()) return;

        var seedLookups = new[]
        {
            ("University of Cape Town - Upper Campus (Rondebosch)", -33.9577, 18.4612),
            ("University of Cape Town - Hiddingh Campus", -33.9267, 18.4142),
            ("University of Cape Town - Health Sciences Campus (Observatory)", -33.9396, 18.4622),
            ("University of the Witwatersrand - Braamfontein Campus", -26.1929, 28.0305),
            ("University of the Witwatersrand - Education Campus (Parktown)", -26.1789, 28.0454),
            ("University of the Witwatersrand - Health Sciences Campus (Parktown)", -26.1799, 28.0424),
            ("University of the Free State - Bloemfontein Campus", -29.1082, 26.1887),
            ("University of the Free State - South Campus", -29.1215, 26.2140),
            ("University of the Free State - Qwaqwa Campus", -28.5083, 28.8236),
            ("University of Johannesburg - Auckland Park Kingsway Campus", -26.1825, 27.9714),
            ("University of Johannesburg - Doornfontein Campus", -26.1959, 28.0507),
            ("University of Johannesburg - Soweto Campus", -26.2485, 27.8540),
            ("University of Pretoria - Hatfield Campus", -25.7545, 28.2314),
            ("University of Pretoria - Groenkloof Campus", -25.7659, 28.2205),
            ("University of Pretoria - Prinshof Campus (Gezina)", -25.7304, 28.1932),
            ("University of KwaZulu-Natal - Howard College Campus", -29.8677, 30.9757),
            ("University of KwaZulu-Natal - Westville Campus", -29.8237, 30.9460),
            ("University of KwaZulu-Natal - Pietermaritzburg Campus", -29.6167, 30.4000),
            ("North-West University - Potchefstroom Campus", -26.6905, 27.0941),
            ("North-West University - Mahikeng Campus", -25.8494, 25.6072),
            ("North-West University - Vanderbijlpark Campus", -26.7080, 27.8378),
            ("Walter Sisulu University - Mthatha Campus", -31.5889, 28.7844),
            ("Walter Sisulu University - Buffalo City Campus", -33.0153, 27.9116),
            ("Walter Sisulu University - Butterworth Campus", -32.3308, 28.1462),
            ("Cape Peninsula University of Technology - Bellville Campus", -33.9321, 18.6431),
            ("Cape Peninsula University of Technology - Cape Town Campus", -33.9280, 18.4172),
            ("Cape Peninsula University of Technology - Wellington Campus", -33.6394, 19.0111),
            ("Stellenbosch University", -33.9321, 18.8602),
            ("Rhodes University", -33.3100, 26.5216),
            ("University of the Western Cape", -33.9346, 18.6291),
            ("Nelson Mandela University", -33.9878, 25.6470),
            ("University of Fort Hare", -32.7847, 26.8420),
            ("University of South Africa", -25.7487, 28.1667),
            ("University of Venda", -22.9776, 30.4467),
            ("University of Limpopo", -23.8809, 29.7382),
            ("Central University of Technology", -29.1039, 26.1929),
            ("Durban University of Technology", -29.8548, 31.0004),
            ("Mangosuthu University of Technology", -29.9701, 30.9101),
            ("Sol Plaatje University", -28.7282, 24.7499),
            ("University of Mpumalanga", -25.4351, 30.9814),
            ("Sefako Makgatho Health Sciences University", -25.6197, 28.0122),
            ("Vaal University of Technology", -26.7145, 27.8489)
        };

        foreach (var (name, latitude, longitude) in seedLookups)
        {
            context.UniversityLookups.Add(new UniversityLookup
            {
                Name = name,
                Latitude = latitude,
                Longitude = longitude
            });
        }

        await context.SaveChangesAsync();
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
        var normalized = userManager.NormalizeEmail(email);
        if (await userManager.Users
                .IgnoreQueryFilters()
                .AnyAsync(user => user.NormalizedEmail == normalized))
            return;

        var user = new AppUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            IsActive = true,
            UniversityId = universityId,
            CurrentUniversityId = universityId,
            CampusId = campusId
        };

        var result = await userManager.CreateAsync(user, password);
        if (result.Succeeded)
            await userManager.AddToRoleAsync(user, role);
    }
}