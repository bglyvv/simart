using MediatR;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Commands.UpsertWatchProgress;

public sealed record UpsertWatchProgressCommand(Guid CallerFamilyId, Guid ChildId, string YoutubeVideoId, int WatchedPct)
    : IRequest<WatchProgressDto>;
