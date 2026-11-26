using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SimartBackend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBooks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "book_images",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    content_type = table.Column<string>(type: "text", nullable: false),
                    data = table.Column<byte[]>(type: "bytea", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_book_images", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "books",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    category = table.Column<string>(type: "text", nullable: false),
                    age_range = table.Column<string>(type: "text", nullable: false),
                    page_count = table.Column<int>(type: "integer", nullable: false),
                    price_azn = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    about = table.Column<string>(type: "text", nullable: false),
                    quote = table.Column<string>(type: "text", nullable: false),
                    isbn = table.Column<string>(type: "text", nullable: true),
                    back_scene = table.Column<string>(type: "text", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    author_name = table.Column<string>(type: "text", nullable: false),
                    author_bio = table.Column<string>(type: "text", nullable: false),
                    author_gender = table.Column<string>(type: "text", nullable: false),
                    cover_image_id = table.Column<Guid>(type: "uuid", nullable: false),
                    back_cover_image_id = table.Column<Guid>(type: "uuid", nullable: true),
                    author_photo_image_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_books", x => x.id);
                    table.ForeignKey(
                        name: "fk_books_admins_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "admins",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_books_book_images_author_photo_image_id",
                        column: x => x.author_photo_image_id,
                        principalTable: "book_images",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_books_book_images_back_cover_image_id",
                        column: x => x.back_cover_image_id,
                        principalTable: "book_images",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_books_book_images_cover_image_id",
                        column: x => x.cover_image_id,
                        principalTable: "book_images",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "book_store_links",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    book_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    url = table.Column<string>(type: "text", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_book_store_links", x => x.id);
                    table.ForeignKey(
                        name: "fk_book_store_links_books_book_id",
                        column: x => x.book_id,
                        principalTable: "books",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_book_store_links_book_id",
                table: "book_store_links",
                column: "book_id");

            migrationBuilder.CreateIndex(
                name: "ix_books_author_photo_image_id",
                table: "books",
                column: "author_photo_image_id");

            migrationBuilder.CreateIndex(
                name: "ix_books_back_cover_image_id",
                table: "books",
                column: "back_cover_image_id");

            migrationBuilder.CreateIndex(
                name: "ix_books_cover_image_id",
                table: "books",
                column: "cover_image_id");

            migrationBuilder.CreateIndex(
                name: "ix_books_deleted_by",
                table: "books",
                column: "deleted_by");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "book_store_links");

            migrationBuilder.DropTable(
                name: "books");

            migrationBuilder.DropTable(
                name: "book_images");
        }
    }
}
