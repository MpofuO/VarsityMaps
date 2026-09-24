using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddParkingAreaAndMultiLegRouting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ParkingAreaId",
                table: "Node",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AllowsPassage",
                table: "Building",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ParkingArea",
                columns: table => new
                {
                    ParkingAreaId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsAccessible = table.Column<bool>(type: "bit", nullable: false),
                    IsGuestAccessible = table.Column<bool>(type: "bit", nullable: false),
                    Boundary = table.Column<Polygon>(type: "geometry", nullable: false),
                    CampusId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParkingArea", x => x.ParkingAreaId);
                    table.ForeignKey(
                        name: "FK_ParkingArea_Campus_CampusId",
                        column: x => x.CampusId,
                        principalTable: "Campus",
                        principalColumn: "CampusId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Node_ParkingAreaId",
                table: "Node",
                column: "ParkingAreaId");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingArea_CampusId",
                table: "ParkingArea",
                column: "CampusId");

            migrationBuilder.AddForeignKey(
                name: "FK_Node_ParkingArea_ParkingAreaId",
                table: "Node",
                column: "ParkingAreaId",
                principalTable: "ParkingArea",
                principalColumn: "ParkingAreaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Node_ParkingArea_ParkingAreaId",
                table: "Node");

            migrationBuilder.DropTable(
                name: "ParkingArea");

            migrationBuilder.DropIndex(
                name: "IX_Node_ParkingAreaId",
                table: "Node");

            migrationBuilder.DropColumn(
                name: "ParkingAreaId",
                table: "Node");

            migrationBuilder.DropColumn(
                name: "AllowsPassage",
                table: "Building");
        }
    }
}
