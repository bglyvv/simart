using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SimartBackend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFamilyIdToHabitTask : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "family_id",
                table: "habit_tasks",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "family_id",
                table: "habit_tasks");
        }
    }
}
