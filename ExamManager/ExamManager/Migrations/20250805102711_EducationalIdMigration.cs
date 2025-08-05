using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamManager.Migrations
{
    /// <inheritdoc />
    public partial class EducationalIdMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EducationalId",
                table: "Institutions",
                type: "character varying(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Institutions_EducationalId",
                table: "Institutions",
                column: "EducationalId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Institutions_EducationalId",
                table: "Institutions");

            migrationBuilder.DropColumn(
                name: "EducationalId",
                table: "Institutions");
        }
    }
}
