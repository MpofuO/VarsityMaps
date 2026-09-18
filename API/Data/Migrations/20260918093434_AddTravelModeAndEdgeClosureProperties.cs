using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTravelModeAndEdgeClosureProperties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TravelMode",
                table: "Route",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "ClosedUntil",
                table: "Edge",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsClosed",
                table: "Edge",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "TravelModes",
                table: "Edge",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TravelMode",
                table: "Route");

            migrationBuilder.DropColumn(
                name: "ClosedUntil",
                table: "Edge");

            migrationBuilder.DropColumn(
                name: "IsClosed",
                table: "Edge");

            migrationBuilder.DropColumn(
                name: "TravelModes",
                table: "Edge");
        }
    }
}
