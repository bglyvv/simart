using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Identity.Dtos;
using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Application.Identity.Commands.RequestChildProfileChange;

public sealed class RequestChildProfileChangeCommandHandler(IFamilyAccountRepository repository)
    : IRequestHandler<RequestChildProfileChangeCommand, ChildProfileChangeRequestDto>
{
    public async Task<ChildProfileChangeRequestDto> Handle(
        RequestChildProfileChangeCommand request, CancellationToken cancellationToken)
    {
        var child = await repository.FindChildAsync(request.ChildId, cancellationToken)
            ?? throw new ChildAccountNotFoundException(request.ChildId);

        if (child.FamilyId != request.CallerFamilyId)
            throw new ChildAccountAccessDeniedException();

        var newName = request.NewName.Trim();
        var newAvatarEmoji = request.NewAvatarEmoji.Trim();
        if (newName.Length == 0 || newAvatarEmoji.Length == 0)
            throw new InvalidChildProfileChangeException();

        if (await repository.FindPendingProfileChangeRequestForChildAsync(request.ChildId, cancellationToken) is not null)
            throw new ProfileChangeRequestAlreadyPendingException();

        var entity = new ChildProfileChangeRequest
        {
            Id = Guid.NewGuid(),
            ChildId = request.ChildId,
            NewName = newName,
            NewAvatarEmoji = newAvatarEmoji,
            Status = "pending",
            RequestedAt = DateTimeOffset.UtcNow,
        };
        await repository.AddProfileChangeRequestAsync(entity, cancellationToken);

        // Built directly rather than via FromDomain(entity) — entity.Child was
        // never set (no need to let EF's change tracker fix up a navigation
        // just to read back a name we already have from the ownership check
        // above).
        return new ChildProfileChangeRequestDto(
            entity.Id, entity.ChildId, child.Name, entity.NewName, entity.NewAvatarEmoji, entity.Status, entity.RequestedAt);
    }
}
