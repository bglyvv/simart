using SimartBackend.Domain.Common;
using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Domain.Entities.Content;

/// <summary>
/// Persisted playlist row. Distinct from <see cref="SimartBackend.Domain.Content.Playlist"/>
/// (the value type <c>IPlaylistCatalog</c> returns today, backed by an embedded JSON seed,
/// not this table) — this is the schema that catalog would read from once a real sync job
/// writes into the database instead of being read fresh from YouTube on every request.
/// </summary>
public class Playlist : ISoftDeletable
{
    public Guid Id { get; set; }

    /// <summary>Null for a playlist an admin created directly (not tied to a real
    /// YouTube playlist) — see "create playlist without a YouTube id" in root
    /// CLAUDE.md. When null, the playlist's public-facing identifier (everywhere
    /// the API used to use this field) falls back to <see cref="Id"/> as a string.</summary>
    public string? YoutubePlaylistId { get; set; }
    public required string Title { get; set; }
    public required string Audience { get; set; }
    public string? Description { get; set; }
    public required string ColorFrom { get; set; }
    public required string ColorTo { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }

    public ICollection<Video> Videos { get; set; } = new List<Video>();
}

public class Video : ISoftDeletable
{
    public Guid Id { get; set; }

    /// <summary>Null until an admin assigns this video to a playlist — a video
    /// discovered on the channel (see GetNewContentQuery) doesn't have to belong to
    /// any playlist at all.</summary>
    public Guid? PlaylistId { get; set; }

    public required string YoutubeVideoId { get; set; }
    public required string Title { get; set; }
    public int DurationSeconds { get; set; }

    /// <summary>"parent" | "child" — set directly by whoever assigns the video
    /// (AssignVideoCommand), not inherited from Playlist.Audience. A playlist's own
    /// Audience is still what the family app actually filters by (it groups videos
    /// by playlist), so an admin normally picks the same value as the playlist's;
    /// this field only really diverges for a video with no playlist.</summary>
    public required string Audience { get; set; }

    /// <summary>Position within the playlist (0-based) — YouTube's own playlist
    /// order isn't otherwise preserved by anything in this schema, and episode/story
    /// numbering depends on it. Meaningless (left at 0) for a playlist-less video.</summary>
    public int SortOrder { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }

    public Playlist? Playlist { get; set; }
}

/// <summary>Per viewer, per video. Exactly one of <see cref="ChildId"/> /
/// <see cref="ParentId"/> is set — enforced by a CHECK constraint, see
/// <c>SimartDbContext</c>.</summary>
public class WatchProgress
{
    public Guid Id { get; set; }
    public Guid? ChildId { get; set; }
    public Guid? ParentId { get; set; }
    public Guid VideoId { get; set; }
    public int WatchedPct { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Child? Child { get; set; }
    public Parent? Parent { get; set; }
    public Video Video { get; set; } = null!;
}
