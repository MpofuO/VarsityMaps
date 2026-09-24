using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveDistanceToNextMetersInRouteGuide : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DistanceToNextMeters",
                table: "RouteGuide");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "DistanceToNextMeters",
                table: "RouteGuide",
                type: "float",
                nullable: false,
                defaultValue: 0.0);
        }
    }
}
