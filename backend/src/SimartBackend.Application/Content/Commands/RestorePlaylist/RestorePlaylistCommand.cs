using MediatR;

namespace SimartBackend.Application.Content.Commands.RestorePlaylist;

/// <summary>Un-deletes a playlist from the admin dashboard's "Silinmiş" tab — the
/// reverse of DeletePlaylistCommand. Its videos were never individually touched by
/// the delete, so restoring the playlist alone brings them all back into view too.</summary>
public sealed record RestorePlaylistCommand(string YoutubePlaylistId) : IRequest;
