using MediatR;

namespace SimartBackend.Application.Content.Commands.DeletePlaylist;

/// <summary>Soft-deletes a playlist — see IContentCatalogRepository.SoftDeletePlaylistAsync
/// for what happens to its videos (nothing, directly; they just stop being reachable
/// once their parent is filtered out).</summary>
public sealed record DeletePlaylistCommand(string YoutubePlaylistId, Guid DeletedByAdminId) : IRequest;
