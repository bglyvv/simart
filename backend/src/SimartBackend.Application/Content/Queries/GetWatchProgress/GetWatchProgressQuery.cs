using MediatR;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Queries.GetWatchProgress;

public sealed record GetWatchProgressQuery(Guid CallerFamilyId, Guid ChildId) : IRequest<IReadOnlyList<WatchProgressDto>>;
