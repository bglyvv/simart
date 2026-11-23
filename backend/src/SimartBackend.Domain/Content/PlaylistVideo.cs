namespace SimartBackend.Domain.Content;

/// <summary>
/// A single video within a playlist. Never a file — the video is always played from
/// YouTube, so this is just enough to embed or link out to it.
/// </summary>
/// <param name="YoutubeId">The real YouTube video ID.</param>
/// <param name="Title"></param>
/// <param name="Duration">m:ss, mm:ss, or h:mm:ss, exactly as YouTube displays it.</param>
public sealed record PlaylistVideo(string YoutubeId, string Title, string Duration);
