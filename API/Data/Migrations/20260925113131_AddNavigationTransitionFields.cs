using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNavigationTransitionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsTransition",
                table: "RouteGuide",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ParkingAreaId",
                table: "RouteGuide",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TravelMode",
                table: "RouteGuide",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Point>(
                name: "TransitionLocation",
                table: "Route",
                type: "geometry",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TransitionNodeId",
                table: "Route",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TransitionParkingAreaId",
                table: "Route",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsTransition",
                table: "RouteGuide");

            migrationBuilder.DropColumn(
                name: "ParkingAreaId",
                table: "RouteGuide");

            migrationBuilder.DropColumn(
                name: "TravelMode",
                table: "RouteGuide");

            migrationBuilder.DropColumn(
                name: "TransitionLocation",
                table: "Route");

            migrationBuilder.DropColumn(
                name: "TransitionNodeId",
                table: "Route");

            migrationBuilder.DropColumn(
                name: "TransitionParkingAreaId",
                table: "Route");
        }
    }
}
