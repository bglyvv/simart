using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Focus.Dtos;
using SimartBackend.Domain.Entities.Focus;

namespace SimartBackend.Application.Focus.Commands.StartFocusLock;

public sealed class StartFocusLockCommandHandler(
    IFamilyAccountRepository familyAccountRepository, IFocusRepository focusRepository)
    : IRequestHandler<StartFocusLockCommand, FocusLockDto>
{
    public async Task<FocusLockDto> Handle(StartFocusLockCommand request, CancellationToken cancellationToken)
    {
        await FocusChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        if (request.Minutes < FocusLockLimits.MinMinutes || request.Minutes > FocusLockLimits.MaxMinutes)
            throw new InvalidFocusLockMinutesException(request.Minutes);

        var now = DateTimeOffset.UtcNow;

        // Idempotent, same reasoning as CompleteHabitTaskCommand: a retried or
        // accidentally-doubled call shouldn't stack a second overlapping lock on
        // top of one that's already running — just report the existing one back.
        var existing = await focusRepository.FindActiveLockAsync(request.ChildId, now, cancellationToken);
        if (existing is not null)
            return FocusLockDto.FromDomain(existing);

        var session = new FocusSession
        {
            Id = Guid.NewGuid(),
            ChildId = request.ChildId,
            StartedAt = now,
            LockedUntil = now.AddMinutes(request.Minutes),
            Minutes = request.Minutes,
            TriggerReason = request.Reason,
        };
        await focusRepository.AddLockAsync(session, cancellationToken);

        return FocusLockDto.FromDomain(session);
    }
}
