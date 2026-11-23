using MediatR;
using SimartBackend.Application.Focus.Dtos;

namespace SimartBackend.Application.Focus.Queries.GetActiveFocusLock;

public sealed record GetActiveFocusLockQuery(Guid CallerFamilyId, Guid ChildId) : IRequest<FocusLockDto?>;
