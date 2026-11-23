using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Queries.GetDeactivatedFamilies;

public sealed class GetDeactivatedFamiliesQueryHandler(IFamilyAccountRepository repository)
    : IRequestHandler<GetDeactivatedFamiliesQuery, IReadOnlyList<FamilySummaryDto>>
{
    public async Task<IReadOnlyList<FamilySummaryDto>> Handle(
        GetDeactivatedFamiliesQuery request, CancellationToken cancellationToken)
    {
        var families = await repository.GetDeactivatedFamiliesWithMembersAsync(cancellationToken);
        return families.Select(FamilySummaryDto.FromDomain).ToList();
    }
}
