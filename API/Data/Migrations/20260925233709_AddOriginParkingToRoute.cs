using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOriginParkingToRoute : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OriginParkingAreaId",
                table: "Route",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<Point>(
                name: "OriginParkingLocation",
                table: "Route",
                type: "geometry",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OriginParkingNodeId",
                table: "Route",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OriginParkingAreaId",
                table: "Route");

            migrationBuilder.DropColumn(
                name: "OriginParkingLocation",
                table: "Route");

            migrationBuilder.DropColumn(
                name: "OriginParkingNodeId",
                table: "Route");
        }
    }
}
