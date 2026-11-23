using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SimartBackend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddScreenTimeEntry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "screen_time_entries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    child_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    total_seconds = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_screen_time_entries", x => x.id);
                    table.ForeignKey(
                        name: "fk_screen_time_entries_children_child_id",
                        column: x => x.child_id,
                        principalTable: "children",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_screen_time_entries_child_id",
                table: "screen_time_entries",
                column: "child_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "screen_time_entries");
        }
    }
}
