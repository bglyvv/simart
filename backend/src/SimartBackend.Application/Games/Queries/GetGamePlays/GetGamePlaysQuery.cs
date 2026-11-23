using MediatR;
using SimartBackend.Application.Games.Dtos;

namespace SimartBackend.Application.Games.Queries.GetGamePlays;

public sealed record GetGamePlaysQuery(Guid CallerFamilyId, Guid ChildId, int Limit) : IRequest<IReadOnlyList<GamePlayDto>>;
