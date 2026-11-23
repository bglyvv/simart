using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SimartBackend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MakeVideoPlaylistOptionalAddAudience : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_videos_playlists_playlist_id",
                table: "videos");

            migrationBuilder.AlterColumn<Guid>(
                name: "playlist_id",
                table: "videos",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "audience",
                table: "videos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddForeignKey(
                name: "fk_videos_playlists_playlist_id",
                table: "videos",
                column: "playlist_id",
                principalTable: "playlists",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_videos_playlists_playlist_id",
                table: "videos");

            migrationBuilder.DropColumn(
                name: "audience",
                table: "videos");

            migrationBuilder.AlterColumn<Guid>(
                name: "playlist_id",
                table: "videos",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "fk_videos_playlists_playlist_id",
                table: "videos",
                column: "playlist_id",
                principalTable: "playlists",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
