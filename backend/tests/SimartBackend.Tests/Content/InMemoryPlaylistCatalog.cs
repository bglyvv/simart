using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Content;

namespace SimartBackend.Tests.Content;

/// <summary>In-memory stand-in for IPlaylistCatalog — just returns whatever list it
/// was constructed with. Used both as the "real" catalog (DbPlaylistCatalog's role)
/// and, separately, as the keyed seed catalog in sync tests — same fake, two roles,
/// matching how SeededPlaylistCatalog and DbPlaylistCatalog are really just two
/// different IPlaylistCatalog implementations in production.</summary>
public sealed class InMemoryPlaylistCatalog(IReadOnlyList<Playlist> playlists) : IPlaylistCatalog
{
    public Task<IReadOnlyList<Playlist>> GetAllAsync(CancellationToken cancellationToken) =>
        Task.FromResult(playlists);
}
