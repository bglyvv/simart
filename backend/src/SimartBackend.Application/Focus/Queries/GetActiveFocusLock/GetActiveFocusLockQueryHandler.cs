using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Focus.Dtos;

namespace SimartBackend.Application.Focus.Queries.GetActiveFocusLock;

public sealed class GetActiveFocusLockQueryHandler(
    IFamilyAccountRepository familyAccountRepository, IFocusRepository focusRepository)
    : IRequestHandler<GetActiveFocusLockQuery, FocusLockDto?>
{
    public async Task<FocusLockDto?> Handle(GetActiveFocusLockQuery request, CancellationToken cancellationToken)
    {
        await FocusChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var active = await focusRepository.FindActiveLockAsync(request.ChildId, DateTimeOffset.UtcNow, cancellationToken);
        return active is null ? null : FocusLockDto.FromDomain(active);
    }
}
