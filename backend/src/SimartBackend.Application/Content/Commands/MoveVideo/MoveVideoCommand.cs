using MediatR;

namespace SimartBackend.Application.Content.Commands.MoveVideo;

/// <summary>Changes which playlist an existing video belongs to (or removes it from
/// any playlist, YoutubePlaylistId null) — the admin dashboard's "change playlist"
/// control on an active video row, and the restore-warning flow's "move this video
/// to a different, active playlist instead of restoring its old one" option. Works
/// on a soft-deleted video too (IgnoreQueryFilters in the repository), since the
/// restore-warning use case needs exactly that.</summary>
public sealed record MoveVideoCommand(string YoutubeVideoId, string? YoutubePlaylistId) : IRequest;
