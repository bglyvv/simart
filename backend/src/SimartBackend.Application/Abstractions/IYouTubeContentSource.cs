using SimartBackend.Domain.Content;

namespace SimartBackend.Application.Abstractions;

/// <summary>The real YouTube Data API v3, as far as Application ever sees it —
/// implemented in Infrastructure, swappable like every other external dependency
/// here. Replaces the old embedded-seed-file approach entirely: there's no static
/// "known good snapshot" anymore, every call talks to the real channel.</summary>
public interface IYouTubeContentSource
{
    /// <summary>Every public video currently on the channel (via its "uploads"
    /// playlist, which YouTube maintains automatically and includes videos
    /// regardless of playlist membership), each tagged with whichever of
    /// <paramref name="knownPlaylistYoutubeIds"/> it was also found in — null if
    /// it isn't in any of them.</summary>
    Task<IReadOnlyList<DiscoveredVideo>> FetchChannelVideosAsync(
        IReadOnlyList<string> knownPlaylistYoutubeIds, CancellationToken cancellationToken);

    /// <summary>Null if no public YouTube playlist has this id at all (a typo, a
    /// private/unlisted playlist, or one that's been deleted on YouTube's side) —
    /// the "Yoxla" (check) button's dry-run call, writes nothing on our side either
    /// way.</summary>
    Task<YoutubePlaylistMetadata?> GetPlaylistMetadataAsync(string playlistId, CancellationToken cancellationToken);

    /// <summary>Every video in this one specific playlist, with real durations —
    /// the "import this whole playlist" flow's actual video list. Unlike
    /// FetchChannelVideosAsync this doesn't go through the channel's uploads
    /// playlist at all, so it works for any public playlist id, not just ones on
    /// the SİMART channel — deliberately not restricted, since an admin typing in
    /// some other channel's playlist id is a usage mistake to catch via review, not
    /// something worth a server-side channel-ownership check.</summary>
    Task<IReadOnlyList<DiscoveredVideo>> FetchPlaylistVideosAsync(string playlistId, CancellationToken cancellationToken);
}

public sealed record YoutubePlaylistMetadata(string Title, int VideoCount);
