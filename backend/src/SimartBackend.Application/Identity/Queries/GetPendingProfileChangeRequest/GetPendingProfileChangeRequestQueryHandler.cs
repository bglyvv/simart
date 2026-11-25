using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Queries.GetPendingProfileChangeRequest;

public sealed class GetPendingProfileChangeRequestQueryHandler(IFamilyAccountRepository repository)
    : IRequestHandler<GetPendingProfileChangeRequestQuery, ChildProfileChangeRequestDto?>
{
    public async Task<ChildProfileChangeRequestDto?> Handle(
        GetPendingProfileChangeRequestQuery request, CancellationToken cancellationToken)
    {
        var child = await repository.FindChildAsync(request.ChildId, cancellationToken)
            ?? throw new ChildAccountNotFoundException(request.ChildId);
        if (child.FamilyId != request.CallerFamilyId)
            throw new ChildAccountAccessDeniedException();

        var pending = await repository.FindPendingProfileChangeRequestForChildAsync(request.ChildId, cancellationToken);
        return pending is null ? null : ChildProfileChangeRequestDto.FromDomain(pending);
    }
}
