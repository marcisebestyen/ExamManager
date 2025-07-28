using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExamManager.Migrations
{
    /// <inheritdoc />
    public partial class SoftDeleteSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Operators",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeletedById",
                table: "Operators",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Operators",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Exams",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeletedById",
                table: "Exams",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Exams",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Examiners",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeletedById",
                table: "Examiners",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Examiners",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "ExamBoards",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeletedById",
                table: "ExamBoards",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "ExamBoards",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Operators_DeletedById",
                table: "Operators",
                column: "DeletedById");

            migrationBuilder.CreateIndex(
                name: "IX_Exams_DeletedById",
                table: "Exams",
                column: "DeletedById");

            migrationBuilder.CreateIndex(
                name: "IX_Examiners_DeletedById",
                table: "Examiners",
                column: "DeletedById");

            migrationBuilder.CreateIndex(
                name: "IX_ExamBoards_DeletedById",
                table: "ExamBoards",
                column: "DeletedById");

            migrationBuilder.AddForeignKey(
                name: "FK_ExamBoards_Operators_DeletedById",
                table: "ExamBoards",
                column: "DeletedById",
                principalTable: "Operators",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Examiners_Operators_DeletedById",
                table: "Examiners",
                column: "DeletedById",
                principalTable: "Operators",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Exams_Operators_DeletedById",
                table: "Exams",
                column: "DeletedById",
                principalTable: "Operators",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Operators_Operators_DeletedById",
                table: "Operators",
                column: "DeletedById",
                principalTable: "Operators",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExamBoards_Operators_DeletedById",
                table: "ExamBoards");

            migrationBuilder.DropForeignKey(
                name: "FK_Examiners_Operators_DeletedById",
                table: "Examiners");

            migrationBuilder.DropForeignKey(
                name: "FK_Exams_Operators_DeletedById",
                table: "Exams");

            migrationBuilder.DropForeignKey(
                name: "FK_Operators_Operators_DeletedById",
                table: "Operators");

            migrationBuilder.DropIndex(
                name: "IX_Operators_DeletedById",
                table: "Operators");

            migrationBuilder.DropIndex(
                name: "IX_Exams_DeletedById",
                table: "Exams");

            migrationBuilder.DropIndex(
                name: "IX_Examiners_DeletedById",
                table: "Examiners");

            migrationBuilder.DropIndex(
                name: "IX_ExamBoards_DeletedById",
                table: "ExamBoards");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Operators");

            migrationBuilder.DropColumn(
                name: "DeletedById",
                table: "Operators");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Operators");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "DeletedById",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Examiners");

            migrationBuilder.DropColumn(
                name: "DeletedById",
                table: "Examiners");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Examiners");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "ExamBoards");

            migrationBuilder.DropColumn(
                name: "DeletedById",
                table: "ExamBoards");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "ExamBoards");
        }
    }
}
