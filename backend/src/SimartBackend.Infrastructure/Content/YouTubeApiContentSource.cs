using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Xml;
using Microsoft.Extensions.Configuration;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Content;

namespace SimartBackend.Infrastructure.Content;

/// <summary>Real calls against the YouTube Data API v3 (googleapis.com/youtube/v3) —
/// replaces the old embedded-JSON-seed approach entirely. Three endpoints: one
/// `channels.list` to resolve the @Simartaz channel's "uploads" playlist (every
/// public video on the channel ends up there automatically, regardless of which
/// other playlists it's also in — this is how a video with no playlist is found at
/// all), one `playlistItems.list` per known playlist (to tag which videos are
/// already in one, for the UI's "suggested playlist" default) plus one more for the
/// uploads playlist itself, and one `videos.list` to get real durations (an ISO 8601
/// string like "PT4M13S" — playlistItems.list doesn't return duration at all).</summary>
public sealed class YouTubeApiContentSource(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    : IYouTubeContentSource
{
    public const string HttpClientName = "YouTubeDataApi";

    /// <summary>The real SİMART channel — see https://www.youtube.com/@Simartaz.</summary>
    private const string ChannelHandle = "@Simartaz";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<IReadOnlyList<DiscoveredVideo>> FetchChannelVideosAsync(
        IReadOnlyList<string> knownPlaylistYoutubeIds, CancellationToken cancellationToken)
    {
        var apiKey = RequireApiKey();
        var client = httpClientFactory.CreateClient(HttpClientName);

        // Which known playlist (if any) each video was found in — first match wins;
        // a video could technically sit in more than one, we only need one default
        // suggestion for the admin review UI, not an exhaustive membership list.
        var foundInPlaylist = new Dictionary<string, string>();
        foreach (var playlistId in knownPlaylistYoutubeIds)
        {
            foreach (var item in await FetchPlaylistItemsAsync(client, apiKey, playlistId, cancellationToken))
                foundInPlaylist.TryAdd(item.VideoId, playlistId);
        }

        var uploadsPlaylistId = await FetchUploadsPlaylistIdAsync(client, apiKey, cancellationToken);
        var uploadsItems = await FetchPlaylistItemsAsync(client, apiKey, uploadsPlaylistId, cancellationToken);

        var videoIds = uploadsItems.Select(i => i.VideoId).Distinct().ToList();
        var durations = await FetchDurationsAsync(client, apiKey, videoIds, cancellationToken);

        return uploadsItems
            .Select(i => new DiscoveredVideo(
                i.VideoId,
                i.Title,
                durations.GetValueOrDefault(i.VideoId, "0:00"),
                foundInPlaylist.GetValueOrDefault(i.VideoId)))
            .ToList();
    }

    public async Task<YoutubePlaylistMetadata?> GetPlaylistMetadataAsync(string playlistId, CancellationToken cancellationToken)
    {
        var apiKey = RequireApiKey();
        var client = httpClientFactory.CreateClient(HttpClientName);

        var url = $"playlists?part=snippet,contentDetails&id={Uri.EscapeDataString(playlistId)}&key={Uri.EscapeDataString(apiKey)}";
        var response = await client.GetFromJsonAsync<PlaylistsListResponse>(url, JsonOptions, cancellationToken);
        var playlist = response?.Items.FirstOrDefault();
        return playlist is null ? null : new YoutubePlaylistMetadata(playlist.Snippet.Title, playlist.ContentDetails.ItemCount);
    }

    public async Task<IReadOnlyList<DiscoveredVideo>> FetchPlaylistVideosAsync(string playlistId, CancellationToken cancellationToken)
    {
        var apiKey = RequireApiKey();
        var client = httpClientFactory.CreateClient(HttpClientName);

        var items = await FetchPlaylistItemsAsync(client, apiKey, playlistId, cancellationToken);
        var videoIds = items.Select(i => i.VideoId).Distinct().ToList();
        var durations = await FetchDurationsAsync(client, apiKey, videoIds, cancellationToken);

        return items
            .Select(i => new DiscoveredVideo(i.VideoId, i.Title, durations.GetValueOrDefault(i.VideoId, "0:00"), playlistId))
            .ToList();
    }

    private string RequireApiKey() => configuration["YouTube:ApiKey"]
        ?? throw new InvalidOperationException(
            "Missing YouTube:ApiKey — set it via `dotnet user-secrets` for local dev " +
            "(see backend/README.md) or the YOUTUBE__APIKEY env var in other environments. " +
            "Get a key from Google Cloud Console (enable the 'YouTube Data API v3') — it's " +
            "free for this volume of calls, no billing account required for the default quota.");

    private static async Task<string> FetchUploadsPlaylistIdAsync(HttpClient client, string apiKey, CancellationToken cancellationToken)
    {
        var url = $"channels?part=contentDetails&forHandle={Uri.EscapeDataString(ChannelHandle)}&key={Uri.EscapeDataString(apiKey)}";
        var response = await client.GetFromJsonAsync<ChannelsListResponse>(url, JsonOptions, cancellationToken);
        var channel = response?.Items.FirstOrDefault()
            ?? throw new InvalidOperationException(
                $"YouTube channels.list returned no channel for handle '{ChannelHandle}' — check YouTube:ApiKey is valid.");
        return channel.ContentDetails.RelatedPlaylists.Uploads;
    }

    private static async Task<List<(string VideoId, string Title)>> FetchPlaylistItemsAsync(
        HttpClient client, string apiKey, string playlistId, CancellationToken cancellationToken)
    {
        var items = new List<(string, string)>();
        string? pageToken = null;
        do
        {
            var url = $"playlistItems?part=snippet&playlistId={Uri.EscapeDataString(playlistId)}&maxResults=50&key={Uri.EscapeDataString(apiKey)}"
                + (pageToken is null ? "" : $"&pageToken={Uri.EscapeDataString(pageToken)}");
            var response = await client.GetFromJsonAsync<PlaylistItemsListResponse>(url, JsonOptions, cancellationToken)
                ?? throw new InvalidOperationException($"YouTube playlistItems.list returned no body for playlist '{playlistId}'.");

            // A removed/private video still has a row in the playlist, just with a
            // placeholder title and no real snippet — skip those rather than surface
            // "Private video" as if it were real content to assign.
            items.AddRange(response.Items
                .Where(i => i.Snippet.Title is not ("Private video" or "Deleted video"))
                .Select(i => (i.Snippet.ResourceId.VideoId, i.Snippet.Title)));

            pageToken = response.NextPageToken;
        } while (pageToken is not null);

        return items;
    }

    private static async Task<Dictionary<string, string>> FetchDurationsAsync(
        HttpClient client, string apiKey, List<string> videoIds, CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, string>();
        foreach (var chunk in videoIds.Chunk(50)) // videos.list accepts at most 50 ids per call
        {
            var url = $"videos?part=contentDetails&id={string.Join(',', chunk)}&key={Uri.EscapeDataString(apiKey)}";
            var response = await client.GetFromJsonAsync<VideosListResponse>(url, JsonOptions, cancellationToken)
                ?? throw new InvalidOperationException("YouTube videos.list returned no body.");

            foreach (var item in response.Items)
            {
                // YouTube returns ISO 8601 durations ("PT4M13S", "PT1H6M9S") —
                // XmlConvert already knows how to parse that exact format.
                var seconds = (int)XmlConvert.ToTimeSpan(item.ContentDetails.Duration).TotalSeconds;
                result[item.Id] = DurationFormat.FormatFromSeconds(seconds);
            }
        }
        return result;
    }

    private sealed record PlaylistsListResponse(List<PlaylistItem> Items);
    private sealed record PlaylistItem(PlaylistSnippet Snippet, PlaylistContentDetails ContentDetails);
    private sealed record PlaylistSnippet(string Title);
    private sealed record PlaylistContentDetails(int ItemCount);

    private sealed record ChannelsListResponse(List<ChannelItem> Items);
    private sealed record ChannelItem(ChannelContentDetails ContentDetails);
    private sealed record ChannelContentDetails(RelatedPlaylists RelatedPlaylists);
    private sealed record RelatedPlaylists(string Uploads);

    private sealed record PlaylistItemsListResponse(List<PlaylistItemEntry> Items, string? NextPageToken);
    private sealed record PlaylistItemEntry(PlaylistItemSnippet Snippet);
    private sealed record PlaylistItemSnippet(string Title, ResourceId ResourceId);
    private sealed record ResourceId(string VideoId);

    private sealed record VideosListResponse(List<VideoItem> Items);
    private sealed record VideoItem(string Id, VideoContentDetails ContentDetails);
    private sealed record VideoContentDetails(string Duration);
}
