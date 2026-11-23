using MediatR;
using SimartBackend.Application.Focus.Dtos;

namespace SimartBackend.Application.Focus.Queries.GetScreenTime;

public sealed record GetScreenTimeQuery(Guid CallerFamilyId, Guid ChildId, DateOnly Date) : IRequest<ScreenTimeDto>;
