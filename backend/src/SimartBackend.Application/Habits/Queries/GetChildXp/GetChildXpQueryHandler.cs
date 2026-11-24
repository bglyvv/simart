using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Habits.Queries.GetChildXp;

public sealed class GetChildXpQueryHandler(
    IFamilyAccountRepository familyAccountRepository, IHabitCatalogRepository habitCatalogRepository)
    : IRequestHandler<GetChildXpQuery, int>
{
    public async Task<int> Handle(GetChildXpQuery request, CancellationToken cancellationToken)
    {
        await HabitChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        return await habitCatalogRepository.GetTotalXpAsync(request.ChildId, cancellationToken);
    }
}
