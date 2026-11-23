using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SimartBackend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPartnersAndVouchers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "partner_id",
                table: "rewards",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "partner_id",
                table: "donation_campaigns",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "partners",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_partners", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vouchers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "text", nullable: false),
                    child_id = table.Column<Guid>(type: "uuid", nullable: false),
                    partner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_type = table.Column<string>(type: "text", nullable: false),
                    source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fulfilled_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_vouchers", x => x.id);
                    table.ForeignKey(
                        name: "fk_vouchers_children_child_id",
                        column: x => x.child_id,
                        principalTable: "children",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_vouchers_partners_partner_id",
                        column: x => x.partner_id,
                        principalTable: "partners",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_rewards_partner_id",
                table: "rewards",
                column: "partner_id");

            migrationBuilder.CreateIndex(
                name: "ix_donation_campaigns_partner_id",
                table: "donation_campaigns",
                column: "partner_id");

            migrationBuilder.CreateIndex(
                name: "ix_vouchers_child_id",
                table: "vouchers",
                column: "child_id");

            migrationBuilder.CreateIndex(
                name: "ix_vouchers_code",
                table: "vouchers",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_vouchers_partner_id",
                table: "vouchers",
                column: "partner_id");

            migrationBuilder.AddForeignKey(
                name: "fk_donation_campaigns_partners_partner_id",
                table: "donation_campaigns",
                column: "partner_id",
                principalTable: "partners",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_rewards_partners_partner_id",
                table: "rewards",
                column: "partner_id",
                principalTable: "partners",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_donation_campaigns_partners_partner_id",
                table: "donation_campaigns");

            migrationBuilder.DropForeignKey(
                name: "fk_rewards_partners_partner_id",
                table: "rewards");

            migrationBuilder.DropTable(
                name: "vouchers");

            migrationBuilder.DropTable(
                name: "partners");

            migrationBuilder.DropIndex(
                name: "ix_rewards_partner_id",
                table: "rewards");

            migrationBuilder.DropIndex(
                name: "ix_donation_campaigns_partner_id",
                table: "donation_campaigns");

            migrationBuilder.DropColumn(
                name: "partner_id",
                table: "rewards");

            migrationBuilder.DropColumn(
                name: "partner_id",
                table: "donation_campaigns");
        }
    }
}
