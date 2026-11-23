using MediatR;
using SimartBackend.Application.Social.Dtos;

namespace SimartBackend.Application.Social.Queries.GetLeaderboard;

/// <summary>No ownership check — this ranks across every family in the app,
/// same as the feed (see ISocialRepository's doc comment). Any authenticated
/// family can see it, same as the original mock's always-visible sidebar.</summary>
public sealed record GetLeaderboardQuery(int Limit) : IRequest<IReadOnlyList<LeaderboardEntryDto>>;
