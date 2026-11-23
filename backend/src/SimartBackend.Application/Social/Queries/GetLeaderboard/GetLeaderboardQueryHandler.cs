using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Social.Dtos;

namespace SimartBackend.Application.Social.Queries.GetLeaderboard;

public sealed class GetLeaderboardQueryHandler(
    IHabitCatalogRepository xpLedger, IFamilyAccountRepository familyAccountRepository)
    : IRequestHandler<GetLeaderboardQuery, IReadOnlyList<LeaderboardEntryDto>>
{
    public async Task<IReadOnlyList<LeaderboardEntryDto>> Handle(
        GetLeaderboardQuery request, CancellationToken cancellationToken)
    {
        var top = await xpLedger.GetTopXpChildrenAsync(request.Limit, cancellationToken);
        if (top.Count == 0)
            return [];

        var children = await familyAccountRepository.GetChildrenByIdsAsync(
            top.Select(t => t.ChildId).ToList(), cancellationToken);
        var avatarByChildId = children.ToDictionary(c => c.Id, c => c.AvatarEmoji);

        // Preserves GetTopXpChildrenAsync's own descending order — a child
        // whose Child row is somehow missing (shouldn't happen outside a
        // test fixture) is skipped rather than shown with a blank avatar.
        return top
            .Where(t => avatarByChildId.ContainsKey(t.ChildId))
            .Select(t => new LeaderboardEntryDto(
                t.ChildId, SocialHandle.Generate(t.ChildId), avatarByChildId[t.ChildId], t.TotalXp))
            .ToList();
    }
}
