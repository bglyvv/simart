using SimartBackend.Domain.Entities.Partners;

namespace SimartBackend.Application.Partners.Dtos;

/// <summary>Returned by partner login — Token is the bearer token to send as
/// `Authorization: Bearer {Token}` on the partner-only voucher endpoints.</summary>
public sealed record PartnerAccountDto(Guid PartnerId, string Name, string Email, string Token);

public sealed record VoucherDto(
    Guid Id, string Code, string ChildName, string Title, string SourceType, string Status,
    DateTimeOffset CreatedAt, DateTimeOffset? FulfilledAt)
{
    public static VoucherDto FromDomain(Voucher voucher) => new(
        voucher.Id, voucher.Code, voucher.Child?.Name ?? string.Empty, voucher.Title, voucher.SourceType,
        voucher.Status, voucher.CreatedAt, voucher.FulfilledAt);
}

/// <summary>One step in a RewardProposal's history — see
/// RewardProposalEventType for every EventType/ActorType value.</summary>
public sealed record RewardProposalEventDto(string EventType, string ActorType, string? Note, DateTimeOffset OccurredAt)
{
    public static RewardProposalEventDto FromDomain(RewardProposalEvent e) => new(e.EventType, e.ActorType, e.Note, e.OccurredAt);
}

/// <summary>Events is always included, oldest first — "there should be a
/// history" was explicit in how this was asked for, not an afterthought.</summary>
public sealed record RewardProposalDto(
    Guid Id, Guid PartnerId, string PartnerName, string Title, string? Description, int CostXp, string Icon,
    string Status, Guid? PublishedRewardId, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt,
    IReadOnlyList<RewardProposalEventDto> Events)
{
    public static RewardProposalDto FromDomain(RewardProposal proposal) => new(
        proposal.Id, proposal.PartnerId, proposal.Partner?.Name ?? string.Empty, proposal.Title, proposal.Description,
        proposal.CostXp, proposal.Icon, proposal.Status, proposal.PublishedRewardId, proposal.CreatedAt, proposal.UpdatedAt,
        proposal.Events.OrderBy(e => e.OccurredAt).Select(RewardProposalEventDto.FromDomain).ToList());
}
