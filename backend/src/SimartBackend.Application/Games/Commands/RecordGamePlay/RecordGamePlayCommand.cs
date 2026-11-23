using MediatR;
using SimartBackend.Application.Games.Dtos;

namespace SimartBackend.Application.Games.Commands.RecordGamePlay;

public sealed record RecordGamePlayCommand(Guid CallerFamilyId, Guid ChildId, string GameId, int Score)
    : IRequest<GamePlayDto>;
