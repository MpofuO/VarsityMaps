using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace API.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceCheckPointWithRouteGuide : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CheckPoint");

            migrationBuilder.CreateTable(
                name: "RouteGuide",
                columns: table => new
                {
                    RouteGuideId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StepIndex = table.Column<int>(type: "int", nullable: false),
                    Location = table.Column<Point>(type: "geography", nullable: false),
                    Instruction = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DistanceToNextMeters = table.Column<double>(type: "float", nullable: false),
                    RouteId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RouteGuide", x => x.RouteGuideId);
                    table.ForeignKey(
                        name: "FK_RouteGuide_Route_RouteId",
                        column: x => x.RouteId,
                        principalTable: "Route",
                        principalColumn: "RouteId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RouteGuide_RouteId",
                table: "RouteGuide",
                column: "RouteId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RouteGuide");

            migrationBuilder.CreateTable(
                name: "CheckPoint",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RouteId = table.Column<int>(type: "int", nullable: false),
                    Location = table.Column<Point>(type: "geography", nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CheckPoint", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CheckPoint_Route_RouteId",
                        column: x => x.RouteId,
                        principalTable: "Route",
                        principalColumn: "RouteId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CheckPoint_RouteId",
                table: "CheckPoint",
                column: "RouteId");
        }
    }
}
