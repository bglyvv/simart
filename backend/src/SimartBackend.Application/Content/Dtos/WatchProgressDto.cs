namespace SimartBackend.Application.Content.Dtos;

/// <summary>GetWatchProgressQuery's list rows and UpsertWatchProgressCommand's
/// response — keyed by YoutubeVideoId (the only video identifier the frontend
/// ever knows), never the internal Video.Id.</summary>
public sealed record WatchProgressDto(string YoutubeVideoId, int WatchedPct);
