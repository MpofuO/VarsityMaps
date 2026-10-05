using System.Text;
using API.Data;
using API.Entities;
using API.Interfaces;
using API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NetTopologySuite.IO.Converters;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new GeoJsonConverterFactory());
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions =>
        {
            sqlOptions.UseNetTopologySuite();
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorNumbersToAdd: null);
        }
    )
);

builder.Services.AddCors();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IMailService, MailService>();
builder.Services.AddScoped<IRouteService, RouteService>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

builder.Services.Configure<MailSettings>(builder.Configuration.GetSection("MailSettings"));

builder.Services.AddIdentityCore<AppUser>(options =>
{
    options.Password.RequireNonAlphanumeric = false;
    options.User.RequireUniqueEmail = true;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var tokenKey = builder.Configuration["TokenKey"] ??
                       throw new InvalidOperationException("TokenKey must be configured.");
        if (Encoding.UTF8.GetByteCount(tokenKey) < 64)
            throw new InvalidOperationException("TokenKey must be at least 64 bytes.");

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(tokenKey)),
            ValidateIssuer = false,
            ValidateAudience = false
        };
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("RequireSystemAdminRole", policy => policy.RequireRole("SystemAdmin"))
    .AddPolicy("RequireUniversityAdminRole", policy => policy.RequireRole("UniversityAdmin"))
    .AddPolicy("RequireCampusAdminRole", policy => policy.RequireRole("CampusAdmin"))
    .AddPolicy("RequireStandardUserRole", policy => policy.RequireRole("StandardUser"))
    .AddPolicy("RequireUniversityAdminOrCampusAdminRole", policy => policy.RequireRole("UniversityAdmin", "CampusAdmin"))
    .AddPolicy("RequireCampusAdminOrStandardUserRole", policy => policy.RequireRole("CampusAdmin", "StandardUser"));

var app = builder.Build();

app.UseHttpsRedirection();
app.UseCors(policy => policy
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()
    .WithOrigins("http://localhost:4200", "https://localhost:4200"));

app.UseAuthentication();
app.UseAuthorization();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
app.MapFallbackToController("Index", "Fallback");

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();

    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        var executionStrategy = context.Database.CreateExecutionStrategy();

        await executionStrategy.ExecuteAsync(async () =>
        {
            var pendingMigrations = await context.Database.GetPendingMigrationsAsync();
            if (pendingMigrations.Any())
            {
                await context.Database.MigrateAsync();
            }

            var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = services.GetRequiredService<UserManager<AppUser>>();
            await SeedData.SeedAsync(context, roleManager, userManager);
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while migrating or seeding the database.");
        throw;
    }
}

app.Run();