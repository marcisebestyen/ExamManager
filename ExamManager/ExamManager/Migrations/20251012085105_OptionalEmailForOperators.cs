using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamManager.Migrations
{
    /// <inheritdoc />
    public partial class OptionalEmailForOperators : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Operators",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Email",
                table: "Operators");
        }
    }
}
