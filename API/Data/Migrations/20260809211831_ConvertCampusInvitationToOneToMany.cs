using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Data.Migrations
{
    /// <inheritdoc />
    public partial class ConvertCampusInvitationToOneToMany : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Invitation_CampusId",
                table: "Invitation");

            migrationBuilder.CreateIndex(
                name: "IX_Invitation_CampusId",
                table: "Invitation",
                column: "CampusId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Invitation_CampusId",
                table: "Invitation");

            migrationBuilder.CreateIndex(
                name: "IX_Invitation_CampusId",
                table: "Invitation",
                column: "CampusId",
                unique: true);
        }
    }
}
