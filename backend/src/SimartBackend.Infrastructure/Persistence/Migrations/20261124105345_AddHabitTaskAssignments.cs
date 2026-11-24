using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SimartBackend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHabitTaskAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "habit_task_assignments",
                columns: table => new
                {
                    task_id = table.Column<Guid>(type: "uuid", nullable: false),
                    child_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_habit_task_assignments", x => new { x.task_id, x.child_id });
                    table.ForeignKey(
                        name: "fk_habit_task_assignments_children_child_id",
                        column: x => x.child_id,
                        principalTable: "children",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_habit_task_assignments_habit_tasks_task_id",
                        column: x => x.task_id,
                        principalTable: "habit_tasks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_habit_task_assignments_child_id",
                table: "habit_task_assignments",
                column: "child_id");

            // Backfill: every existing family-created task gets one assignment
            // row per child currently in that family — preserves today's
            // "every family child can do every custom task" behavior for
            // anything that already exists (see HabitTaskAssignment's own doc
            // comment). Admin-catalog tasks (family_id IS NULL) are untouched —
            // they were never restricted by this table and never will be.
            migrationBuilder.Sql(
                """
                INSERT INTO habit_task_assignments (task_id, child_id)
                SELECT ht.id, c.id
                FROM habit_tasks ht
                JOIN children c ON c.family_id = ht.family_id
                WHERE ht.family_id IS NOT NULL
                  AND ht.is_deleted = false
                  AND c.is_deleted = false;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "habit_task_assignments");
        }
    }
}
