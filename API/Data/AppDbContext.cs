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
    public DbSet<Node> Nodes { get; set; }
    public DbSet<Edge> Edges { get; set; }
    public DbSet<Route> Routes { get; set; }
    public DbSet<Checkpoint> Checkpoints { get; set; }
    public DbSet<Invitation> Invitations { get; set; }
    public DbSet<Application> Applications { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<University>().ToTable("University");
        builder.Entity<Campus>().ToTable("Campus");
        builder.Entity<Building>().ToTable("Building");
        builder.Entity<Node>().ToTable("Node");
        builder.Entity<Edge>().ToTable("Edge");
        builder.Entity<Route>().ToTable("Route");
        builder.Entity<Checkpoint>().ToTable("Checkpoint");
        builder.Entity<Invitation>().ToTable("Invitation");
        builder.Entity<Application>().ToTable("Application");


        builder.Entity<University>()
            .HasMany(u => u.Campuses)
            .WithOne(c => c.University)
            .HasForeignKey(c => c.UniversityId);

        builder.Entity<Campus>()
            .HasMany(c => c.Buildings)
            .WithOne(b => b.Campus)
            .HasForeignKey(b => b.CampusId);

        builder.Entity<Campus>()
            .HasMany(c => c.Nodes)
            .WithOne(n => n.Campus)
            .HasForeignKey(n => n.CampusId);

        builder.Entity<Campus>()
            .HasMany(c => c.Edges)
            .WithOne(e => e.Campus)
            .HasForeignKey(e => e.CampusId);

        builder.Entity<Building>()
            .HasMany(b => b.Entrances)
            .WithOne(n => n.Building)
            .HasForeignKey(n => n.BuildingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Node>()
            .HasMany(n => n.OutgoingEdges)
            .WithOne(e => e.FromNode)
            .HasForeignKey(e => e.FromNodeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Node>()
            .HasMany(n => n.IncomingEdges)
            .WithOne(e => e.ToNode)
            .HasForeignKey(e => e.ToNodeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Route>()
            .HasMany(r => r.Checkpoints)
            .WithOne(c => c.Route)
            .HasForeignKey(c => c.RouteId);
    }
}
