using SimartBackend.Domain.Content;

namespace SimartBackend.Application.Abstractions;

/// <summary>
/// Source of truth for playlists, already merged with the local audience mapping.
/// Implemented in the Infrastructure layer — today by a seeded snapshot, eventually
/// by a real YouTube Data API sync. The Application layer only ever depends on this
/// interface, so that swap won't touch any query or handler.
/// </summary>
public interface IPlaylistCatalog
{
    Task<IReadOnlyList<Playlist>> GetAllAsync(CancellationToken cancellationToken);
}
