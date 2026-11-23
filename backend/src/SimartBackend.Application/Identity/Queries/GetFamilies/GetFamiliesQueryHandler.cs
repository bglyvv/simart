using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Queries.GetFamilies;

public sealed class GetFamiliesQueryHandler(IFamilyAccountRepository repository)
    : IRequestHandler<GetFamiliesQuery, IReadOnlyList<FamilySummaryDto>>
{
    public async Task<IReadOnlyList<FamilySummaryDto>> Handle(GetFamiliesQuery request, CancellationToken cancellationToken)
    {
        var families = await repository.GetAllFamiliesWithMembersAsync(cancellationToken);
        return families.Select(FamilySummaryDto.FromDomain).ToList();
    }
}
