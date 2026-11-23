using SimartBackend.Application.Content.Queries.GetPlaylists;
using SimartBackend.Domain.Content;

namespace SimartBackend.Tests.Content;

public class GetPlaylistsQueryHandlerTests
{
    [Fact]
    public async Task Returns_every_playlist_when_no_audience_filter_is_given()
    {
        var catalog = new InMemoryPlaylistCatalog([TestPlaylists.ParentPlaylist(), TestPlaylists.ChildPlaylist()]);
        var handler = new GetPlaylistsQueryHandler(catalog);

        var result = await handler.Handle(new GetPlaylistsQuery(Audience: null), CancellationToken.None);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task Filters_to_only_the_requested_audience()
    {
        var catalog = new InMemoryPlaylistCatalog([TestPlaylists.ParentPlaylist(), TestPlaylists.ChildPlaylist()]);
        var handler = new GetPlaylistsQueryHandler(catalog);

        var result = await handler.Handle(new GetPlaylistsQuery(Audience.Child), CancellationToken.None);

        var playlist = Assert.Single(result);
        Assert.Equal("child", playlist.Audience);
        Assert.Equal("3D Animasiyalar", playlist.Title);
    }

    [Fact]
    public async Task Maps_every_field_videos_included()
    {
        var catalog = new InMemoryPlaylistCatalog([TestPlaylists.ChildPlaylist()]);
        var handler = new GetPlaylistsQueryHandler(catalog);

        var result = await handler.Handle(new GetPlaylistsQuery(Audience: null), CancellationToken.None);
        var dto = Assert.Single(result);

        Assert.Equal("PL_child_1", dto.Id);
        Assert.Equal("3D Animasiyalar", dto.Title);
        Assert.Equal("child", dto.Audience);
        Assert.Null(dto.Description);
        Assert.Equal("#333333", dto.ColorFrom);
        Assert.Equal(2, dto.Videos.Count);
        Assert.Equal("yt_c1", dto.Videos[0].YoutubeId);
        Assert.Equal("7:51", dto.Videos[1].Duration);
    }
}
