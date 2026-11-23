namespace SimartBackend.Application.Content;

/// <summary>Thrown by AssignVideoCommandHandler when a non-null YoutubePlaylistId
/// doesn't match any playlist we have — mapped to 404 by the Api endpoint.</summary>
public sealed class PlaylistNotFoundException(string youtubePlaylistId)
    : Exception($"Playlist '{youtubePlaylistId}' was not found.");

/// <summary>Thrown by DeleteVideoCommandHandler when the given youtubeVideoId
/// doesn't match any (non-already-deleted) video — mapped to 404 by the Api
/// endpoint.</summary>
public sealed class VideoNotFoundException(string youtubeVideoId)
    : Exception($"Video '{youtubeVideoId}' was not found.");

/// <summary>Thrown by CreatePlaylistCommandHandler when a playlist with this
/// youtubePlaylistId already exists — including a soft-deleted one, so a removed
/// playlist's id can't silently collide with a freshly created row. Mapped to 409.</summary>
public sealed class PlaylistAlreadyExistsException(string youtubePlaylistId)
    : Exception($"Playlist '{youtubePlaylistId}' already exists.");

/// <summary>Thrown by the watch-progress handlers when the given childId doesn't
/// exist — mapped to 404. Same split-purpose as HabitChildNotFoundException: about
/// resolving which family owns a child for the ownership check, not about family
/// existence itself. These are this domain's first family-facing (not admin-only)
/// endpoints, hence a child-ownership check existing here at all.</summary>
public sealed class ContentChildNotFoundException(Guid childId)
    : Exception($"Child '{childId}' was not found.");

/// <summary>Thrown by the watch-progress handlers when the caller's token family
/// doesn't own the given child — mapped to 403, same "can't write into another
/// family" rule as HabitAccessDeniedException.</summary>
public sealed class ContentAccessDeniedException()
    : Exception("This child does not belong to your family.");

/// <summary>Thrown by UpsertWatchProgressCommandHandler when WatchedPct falls
/// outside 0-100 — mapped to 400.</summary>
public sealed class InvalidWatchedPctException(int watchedPct)
    : Exception($"Watched percentage {watchedPct} must be between 0 and 100.");
