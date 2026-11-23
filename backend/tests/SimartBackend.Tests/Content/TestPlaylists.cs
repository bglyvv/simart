using SimartBackend.Domain.Content;

namespace SimartBackend.Tests.Content;

internal static class TestPlaylists
{
    public static Playlist ParentPlaylist() => new(
        Id: "PL_parent_1",
        YoutubePlaylistId: "PL_parent_1",
        Title: "Valideyn Bələdçisi",
        Audience: Audience.Parent,
        Description: "Parent guide",
        ColorFrom: "#111111",
        ColorTo: "#222222",
        Videos: [new PlaylistVideo("yt_p1", "Episode 1", "1:16:08")]);

    public static Playlist ChildPlaylist() => new(
        Id: "PL_child_1",
        YoutubePlaylistId: "PL_child_1",
        Title: "3D Animasiyalar",
        Audience: Audience.Child,
        Description: null,
        ColorFrom: "#333333",
        ColorTo: "#444444",
        Videos:
        [
            new PlaylistVideo("yt_c1", "Video 1", "0:58"),
            new PlaylistVideo("yt_c2", "Video 2", "7:51"),
        ]);
}
