using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SimartBackend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "admins",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    full_name = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_admins", x => x.id);
                    table.ForeignKey(
                        name: "fk_admins_admins_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "admins",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "donation_campaigns",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    sponsor = table.Column<string>(type: "text", nullable: true),
                    xp_cost = table.Column<int>(type: "integer", nullable: false),
                    azn_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    icon = table.Column<string>(type: "text", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_donation_campaigns", x => x.id);
                    table.ForeignKey(
                        name: "fk_donation_campaigns_admins_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "admins",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "families",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_families", x => x.id);
                    table.ForeignKey(
                        name: "fk_families_admins_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "admins",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "games",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    slug = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    icon = table.Column<string>(type: "text", nullable: false),
                    axis = table.Column<string>(type: "text", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_games", x => x.id);
                    table.ForeignKey(
                        name: "fk_games_admins_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "admins",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "habit_categories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    icon = table.Column<string>(type: "text", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_habit_categories", x => x.id);
                    table.ForeignKey(
                        name: "fk_habit_categories_admins_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "admins",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "playlists",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    youtube_playlist_id = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    audience = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    color_from = table.Column<string>(type: "text", nullable: false),
                    color_to = table.Column<string>(type: "text", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_playlists", x => x.id);
                    table.ForeignKey(
                        name: "fk_playlists_admins_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "admins",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "rewards",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    cost_xp = table.Column<int>(type: "integer", nullable: false),
                    sponsor = table.Column<string>(type: "text", nullable: true),
                    icon = table.Column<string>(type: "text", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_rewards", x => x.id);
                    table.ForeignKey(
                        name: "fk_rewards_admins_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "admins",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "children",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    family_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    avatar_emoji = table.Column<string>(type: "text", nullable: false),
                    gender = table.Column<string>(type: "text", nullable: false),
                    date_of_birth = table.Column<DateOnly>(type: "date", nullable: false),
                    city = table.Column<string>(type: "text", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_children", x => x.id);
                    table.ForeignKey(
                        name: "fk_children_admins_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "admins",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_children_families_family_id",
                        column: x => x.family_id,
                        principalTable: "families",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "parents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    family_id = table.Column<Guid>(type: "uuid", nullable: false),
                    full_name = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    pin_hash = table.Column<string>(type: "text", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_parents", x => x.id);
                    table.ForeignKey(
                        name: "fk_parents_admins_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "admins",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_parents_families_family_id",
                        column: x => x.family_id,
                        principalTable: "families",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "habit_tasks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    category_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    xp_value = table.Column<int>(type: "integer", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_habit_tasks", x => x.id);
                    table.ForeignKey(
                        name: "fk_habit_tasks_admins_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "admins",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_habit_tasks_habit_categories_category_id",
                        column: x => x.category_id,
                        principalTable: "habit_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "videos",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    playlist_id = table.Column<Guid>(type: "uuid", nullable: false),
                    youtube_video_id = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    duration_seconds = table.Column<int>(type: "integer", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_videos", x => x.id);
                    table.ForeignKey(
                        name: "fk_videos_admins_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "admins",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_videos_playlists_playlist_id",
                        column: x => x.playlist_id,
                        principalTable: "playlists",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "focus_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    child_id = table.Column<Guid>(type: "uuid", nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    locked_until = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    minutes = table.Column<int>(type: "integer", nullable: false),
                    trigger_reason = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_focus_sessions", x => x.id);
                    table.ForeignKey(
                        name: "fk_focus_sessions_children_child_id",
                        column: x => x.child_id,
                        principalTable: "children",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "game_results",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    child_id = table.Column<Guid>(type: "uuid", nullable: false),
                    game_id = table.Column<Guid>(type: "uuid", nullable: false),
                    score = table.Column<int>(type: "integer", nullable: false),
                    played_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_results", x => x.id);
                    table.ForeignKey(
                        name: "fk_game_results_children_child_id",
                        column: x => x.child_id,
                        principalTable: "children",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_game_results_games_game_id",
                        column: x => x.game_id,
                        principalTable: "games",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "social_posts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    child_id = table.Column<Guid>(type: "uuid", nullable: false),
                    handle = table.Column<string>(type: "text", nullable: false),
                    avatar_emoji = table.Column<string>(type: "text", nullable: false),
                    caption = table.Column<string>(type: "text", nullable: false),
                    media_emoji = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_social_posts", x => x.id);
                    table.ForeignKey(
                        name: "fk_social_posts_admins_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "admins",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_social_posts_children_child_id",
                        column: x => x.child_id,
                        principalTable: "children",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "wallet_transactions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    child_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    direction = table.Column<string>(type: "text", nullable: false),
                    amount_azn = table.Column<decimal>(type: "numeric", nullable: false),
                    source_type = table.Column<string>(type: "text", nullable: false),
                    source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_wallet_transactions", x => x.id);
                    table.ForeignKey(
                        name: "fk_wallet_transactions_children_child_id",
                        column: x => x.child_id,
                        principalTable: "children",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "xp_transactions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    child_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<int>(type: "integer", nullable: false),
                    reason = table.Column<string>(type: "text", nullable: false),
                    source_type = table.Column<string>(type: "text", nullable: false),
                    source_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_xp_transactions", x => x.id);
                    table.ForeignKey(
                        name: "fk_xp_transactions_children_child_id",
                        column: x => x.child_id,
                        principalTable: "children",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "reward_redemptions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    child_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reward_id = table.Column<Guid>(type: "uuid", nullable: false),
                    approved_by_parent_id = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    redeemed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_reward_redemptions", x => x.id);
                    table.ForeignKey(
                        name: "fk_reward_redemptions_children_child_id",
                        column: x => x.child_id,
                        principalTable: "children",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_reward_redemptions_parents_approved_by_parent_id",
                        column: x => x.approved_by_parent_id,
                        principalTable: "parents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_reward_redemptions_rewards_reward_id",
                        column: x => x.reward_id,
                        principalTable: "rewards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "habit_completions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    child_id = table.Column<Guid>(type: "uuid", nullable: false),
                    task_id = table.Column<Guid>(type: "uuid", nullable: false),
                    log_date = table.Column<DateOnly>(type: "date", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_habit_completions", x => x.id);
                    table.ForeignKey(
                        name: "fk_habit_completions_children_child_id",
                        column: x => x.child_id,
                        principalTable: "children",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_habit_completions_habit_tasks_task_id",
                        column: x => x.task_id,
                        principalTable: "habit_tasks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "watch_progresses",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    child_id = table.Column<Guid>(type: "uuid", nullable: true),
                    parent_id = table.Column<Guid>(type: "uuid", nullable: true),
                    video_id = table.Column<Guid>(type: "uuid", nullable: false),
                    watched_pct = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_watch_progresses", x => x.id);
                    table.CheckConstraint("CK_watch_progress_exactly_one_viewer", "(child_id IS NOT NULL) <> (parent_id IS NOT NULL)");
                    table.ForeignKey(
                        name: "fk_watch_progresses_children_child_id",
                        column: x => x.child_id,
                        principalTable: "children",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_watch_progresses_parents_parent_id",
                        column: x => x.parent_id,
                        principalTable: "parents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_watch_progresses_videos_video_id",
                        column: x => x.video_id,
                        principalTable: "videos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "post_likes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    child_id = table.Column<Guid>(type: "uuid", nullable: false),
                    post_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_post_likes", x => x.id);
                    table.ForeignKey(
                        name: "fk_post_likes_children_child_id",
                        column: x => x.child_id,
                        principalTable: "children",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_post_likes_social_posts_post_id",
                        column: x => x.post_id,
                        principalTable: "social_posts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "social_comments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    post_id = table.Column<Guid>(type: "uuid", nullable: false),
                    child_id = table.Column<Guid>(type: "uuid", nullable: false),
                    parent_comment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    body = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_social_comments", x => x.id);
                    table.ForeignKey(
                        name: "fk_social_comments_admins_deleted_by",
                        column: x => x.deleted_by,
                        principalTable: "admins",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_social_comments_children_child_id",
                        column: x => x.child_id,
                        principalTable: "children",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_social_comments_social_comments_parent_comment_id",
                        column: x => x.parent_comment_id,
                        principalTable: "social_comments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_social_comments_social_posts_post_id",
                        column: x => x.post_id,
                        principalTable: "social_posts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "comment_likes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    child_id = table.Column<Guid>(type: "uuid", nullable: false),
                    comment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_comment_likes", x => x.id);
                    table.ForeignKey(
                        name: "fk_comment_likes_children_child_id",
                        column: x => x.child_id,
                        principalTable: "children",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_comment_likes_social_comments_comment_id",
                        column: x => x.comment_id,
                        principalTable: "social_comments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_admins_deleted_by",
                table: "admins",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_children_deleted_by",
                table: "children",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_children_family_id",
                table: "children",
                column: "family_id");

            migrationBuilder.CreateIndex(
                name: "ix_comment_likes_child_id",
                table: "comment_likes",
                column: "child_id");

            migrationBuilder.CreateIndex(
                name: "ix_comment_likes_comment_id",
                table: "comment_likes",
                column: "comment_id");

            migrationBuilder.CreateIndex(
                name: "ix_donation_campaigns_deleted_by",
                table: "donation_campaigns",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_families_deleted_by",
                table: "families",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_focus_sessions_child_id",
                table: "focus_sessions",
                column: "child_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_results_child_id",
                table: "game_results",
                column: "child_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_results_game_id",
                table: "game_results",
                column: "game_id");

            migrationBuilder.CreateIndex(
                name: "ix_games_deleted_by",
                table: "games",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_habit_categories_deleted_by",
                table: "habit_categories",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_habit_completions_child_id",
                table: "habit_completions",
                column: "child_id");

            migrationBuilder.CreateIndex(
                name: "ix_habit_completions_task_id",
                table: "habit_completions",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "ix_habit_tasks_category_id",
                table: "habit_tasks",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "ix_habit_tasks_deleted_by",
                table: "habit_tasks",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_parents_deleted_by",
                table: "parents",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_parents_family_id",
                table: "parents",
                column: "family_id");

            migrationBuilder.CreateIndex(
                name: "ix_playlists_deleted_by",
                table: "playlists",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_post_likes_child_id",
                table: "post_likes",
                column: "child_id");

            migrationBuilder.CreateIndex(
                name: "ix_post_likes_post_id",
                table: "post_likes",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "ix_reward_redemptions_approved_by_parent_id",
                table: "reward_redemptions",
                column: "approved_by_parent_id");

            migrationBuilder.CreateIndex(
                name: "ix_reward_redemptions_child_id",
                table: "reward_redemptions",
                column: "child_id");

            migrationBuilder.CreateIndex(
                name: "ix_reward_redemptions_reward_id",
                table: "reward_redemptions",
                column: "reward_id");

            migrationBuilder.CreateIndex(
                name: "ix_rewards_deleted_by",
                table: "rewards",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_social_comments_child_id",
                table: "social_comments",
                column: "child_id");

            migrationBuilder.CreateIndex(
                name: "ix_social_comments_deleted_by",
                table: "social_comments",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_social_comments_parent_comment_id",
                table: "social_comments",
                column: "parent_comment_id");

            migrationBuilder.CreateIndex(
                name: "ix_social_comments_post_id",
                table: "social_comments",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "ix_social_posts_child_id",
                table: "social_posts",
                column: "child_id");

            migrationBuilder.CreateIndex(
                name: "ix_social_posts_deleted_by",
                table: "social_posts",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_videos_deleted_by",
                table: "videos",
                column: "deleted_by");

            migrationBuilder.CreateIndex(
                name: "ix_videos_playlist_id",
                table: "videos",
                column: "playlist_id");

            migrationBuilder.CreateIndex(
                name: "ix_wallet_transactions_child_id",
                table: "wallet_transactions",
                column: "child_id");

            migrationBuilder.CreateIndex(
                name: "ix_watch_progresses_child_id",
                table: "watch_progresses",
                column: "child_id");

            migrationBuilder.CreateIndex(
                name: "ix_watch_progresses_parent_id",
                table: "watch_progresses",
                column: "parent_id");

            migrationBuilder.CreateIndex(
                name: "ix_watch_progresses_video_id",
                table: "watch_progresses",
                column: "video_id");

            migrationBuilder.CreateIndex(
                name: "ix_xp_transactions_child_id",
                table: "xp_transactions",
                column: "child_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "comment_likes");

            migrationBuilder.DropTable(
                name: "donation_campaigns");

            migrationBuilder.DropTable(
                name: "focus_sessions");

            migrationBuilder.DropTable(
                name: "game_results");

            migrationBuilder.DropTable(
                name: "habit_completions");

            migrationBuilder.DropTable(
                name: "post_likes");

            migrationBuilder.DropTable(
                name: "reward_redemptions");

            migrationBuilder.DropTable(
                name: "wallet_transactions");

            migrationBuilder.DropTable(
                name: "watch_progresses");

            migrationBuilder.DropTable(
                name: "xp_transactions");

            migrationBuilder.DropTable(
                name: "social_comments");

            migrationBuilder.DropTable(
                name: "games");

            migrationBuilder.DropTable(
                name: "habit_tasks");

            migrationBuilder.DropTable(
                name: "rewards");

            migrationBuilder.DropTable(
                name: "parents");

            migrationBuilder.DropTable(
                name: "videos");

            migrationBuilder.DropTable(
                name: "social_posts");

            migrationBuilder.DropTable(
                name: "habit_categories");

            migrationBuilder.DropTable(
                name: "playlists");

            migrationBuilder.DropTable(
                name: "children");

            migrationBuilder.DropTable(
                name: "families");

            migrationBuilder.DropTable(
                name: "admins");
        }
    }
}
