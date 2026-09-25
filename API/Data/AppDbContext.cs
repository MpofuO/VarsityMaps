using API.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Route = API.Entities.Route;

namespace API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<AppUser>(options)
{
    public DbSet<University> Universities { get; set; }
    public DbSet<Campus> Campuses { get; set; }
    public DbSet<Building> Buildings { get; set; }
    public DbSet<ParkingArea> ParkingAreas { get; set; }
    public DbSet<Node> Nodes { get; set; }
    public DbSet<Edge> Edges { get; set; }
    public DbSet<Route> Routes { get; set; }
    public DbSet<RouteGuide> RouteGuides { get; set; }
    public DbSet<Invitation> Invitations { get; set; }
    public DbSet<Application> Applications { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<AppUser>().HasQueryFilter(x => !x.IsDeleted);

        builder.Entity<University>().ToTable("University");
        builder.Entity<Campus>().ToTable("Campus");
        builder.Entity<Building>().ToTable("Building");
        builder.Entity<ParkingArea>().ToTable("ParkingArea");
        builder.Entity<Node>().ToTable("Node");
        builder.Entity<Edge>().ToTable("Edge");
        builder.Entity<Route>().ToTable("Route");
        builder.Entity<RouteGuide>().ToTable("RouteGuide");
        builder.Entity<Invitation>().ToTable("Invitation");
        builder.Entity<Application>().ToTable("Application");

        builder.Entity<Building>(entity =>
        {
            entity.Property(e => e.Boundary)
                .HasColumnType("geometry");
        });
        builder.Entity<ParkingArea>(entity =>
        {
            entity.Property(e => e.Boundary)
                .HasColumnType("geometry");
        });
        builder.Entity<Node>(entity =>
        {
            entity.Property(e => e.Location)
                .HasColumnType("geometry");
        });
        builder.Entity<Route>(entity =>
        {
            entity.Property(e => e.Path)
                .HasColumnType("geometry");
            entity.Property(e => e.TransitionLocation)
                .HasColumnType("geometry");
        });

        builder.Entity<Edge>(entity =>
        {
            entity.Property(e => e.Weight)
                .HasPrecision(10, 2);
        });
        builder.Entity<Route>(entity =>
        {
            entity.Property(e => e.Weight)
                .HasPrecision(10, 2);
        });

        builder.Entity<University>()
            .HasMany(u => u.Campuses)
            .WithOne(c => c.University)
            .HasForeignKey(c => c.UniversityId);

        builder.Entity<Campus>()
            .HasMany(c => c.Buildings)
            .WithOne(b => b.Campus)
            .HasForeignKey(b => b.CampusId);

        builder.Entity<Campus>()
            .HasMany(c => c.ParkingAreas)
            .WithOne(p => p.Campus)
            .HasForeignKey(p => p.CampusId);

        builder.Entity<Campus>()
            .HasMany(c => c.Nodes)
            .WithOne(n => n.Campus)
            .HasForeignKey(n => n.CampusId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.Entity<Building>()
            .HasMany(b => b.Entrances)
            .WithOne(n => n.Building)
            .HasForeignKey(n => n.BuildingId);

        builder.Entity<ParkingArea>()
            .HasMany(p => p.AccessNodes)
            .WithOne(n => n.ParkingArea)
            .HasForeignKey(n => n.ParkingAreaId);

        builder.Entity<Node>()
            .HasMany(n => n.OutgoingEdges)
            .WithOne(e => e.FromNode)
            .HasForeignKey(e => e.FromNodeId);

        builder.Entity<Node>()
            .HasMany(n => n.IncomingEdges)
            .WithOne(e => e.ToNode)
            .HasForeignKey(e => e.ToNodeId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.Entity<Route>()
            .HasMany(r => r.RouteGuides)
            .WithOne(g => g.Route)
            .HasForeignKey(g => g.RouteId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Invitation>()
            .HasOne(i => i.Campus)
            .WithMany(c => c.Invitations)
            .HasForeignKey(i => i.CampusId);
    }
}