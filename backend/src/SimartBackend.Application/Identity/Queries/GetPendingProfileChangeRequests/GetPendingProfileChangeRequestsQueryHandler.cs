using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Queries.GetPendingProfileChangeRequests;

public sealed class GetPendingProfileChangeRequestsQueryHandler(IFamilyAccountRepository repository)
    : IRequestHandler<GetPendingProfileChangeRequestsQuery, IReadOnlyList<ChildProfileChangeRequestDto>>
{
    public async Task<IReadOnlyList<ChildProfileChangeRequestDto>> Handle(
        GetPendingProfileChangeRequestsQuery request, CancellationToken cancellationToken)
    {
        var children = await repository.GetChildrenAsync(request.CallerFamilyId, cancellationToken);
        var childIds = children.Select(c => c.Id).ToList();

        var pending = await repository.GetPendingProfileChangeRequestsForChildrenAsync(childIds, cancellationToken);
        return pending.Select(ChildProfileChangeRequestDto.FromDomain).ToList();
    }
}
