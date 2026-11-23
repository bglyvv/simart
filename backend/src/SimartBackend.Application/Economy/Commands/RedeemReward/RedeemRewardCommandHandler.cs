using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Economy.Dtos;
using SimartBackend.Application.Partners;
using SimartBackend.Domain.Entities.Economy;
using SimartBackend.Domain.Entities.Partners;

namespace SimartBackend.Application.Economy.Commands.RedeemReward;

public sealed class RedeemRewardCommandHandler(
    IFamilyAccountRepository familyAccountRepository, IRewardRepository rewardRepository,
    IHabitCatalogRepository xpLedger, IVoucherRepository voucherRepository)
    : IRequestHandler<RedeemRewardCommand, RewardRedemptionDto>
{
    public const string SourceType = "reward_redemption";

    public async Task<RewardRedemptionDto> Handle(RedeemRewardCommand request, CancellationToken cancellationToken)
    {
        await RewardChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var reward = await rewardRepository.FindRewardAsync(request.RewardId, cancellationToken)
            ?? throw new RewardNotFoundException(request.RewardId);

        // A "rejected" latest attempt doesn't block a retry — see
        // RewardAlreadyRedeemedException's doc comment.
        var latestByReward = await rewardRepository.GetLatestRedemptionsByRewardAsync(request.ChildId, cancellationToken);
        if (latestByReward.TryGetValue(request.RewardId, out var latest) && latest.Status != "rejected")
            throw new RewardAlreadyRedeemedException(request.RewardId);

        var totalXp = await xpLedger.GetTotalXpAsync(request.ChildId, cancellationToken);
        if (totalXp < reward.CostXp)
            throw new InsufficientXpException(reward.CostXp, totalXp);

        var redemption = new RewardRedemption
        {
            Id = Guid.NewGuid(),
            ChildId = request.ChildId,
            RewardId = reward.Id,
            Status = "pending",
            RedeemedAt = DateTimeOffset.UtcNow,
        };
        await rewardRepository.AddRedemptionAsync(redemption, cancellationToken);

        // Debited immediately, not on approval — reserves the XP so a child
        // can't request two rewards they can only actually afford one of
        // before a parent gets to either. Refunded by RejectRewardRedemption
        // if the parent says no.
        await xpLedger.AddXpTransactionAsync(new XpTransaction
        {
            Id = Guid.NewGuid(),
            ChildId = request.ChildId,
            Amount = -reward.CostXp,
            Reason = $"Mükafat: {reward.Title}",
            SourceType = SourceType,
            SourceId = redemption.Id,
            CreatedAt = DateTimeOffset.UtcNow,
        }, cancellationToken);

        // Only created when this reward has a real partner behind it (the
        // bookstore, the ice cream shop, ...) — a reward with no PartnerId
        // yet simply has nothing to hand a QR voucher to. The voucher exists
        // from this moment, but FulfillVoucherCommand still won't let a
        // partner collect it until a parent approves this redemption — see
        // that handler's own doc comment.
        string? voucherCode = null;
        if (reward.PartnerId is Guid partnerId)
        {
            voucherCode = VoucherCodeGenerator.Generate();
            await voucherRepository.AddVoucherAsync(new Voucher
            {
                Id = Guid.NewGuid(),
                Code = voucherCode,
                ChildId = request.ChildId,
                PartnerId = partnerId,
                SourceType = SourceType,
                SourceId = redemption.Id,
                Title = reward.Title,
                Status = "pending",
                CreatedAt = DateTimeOffset.UtcNow,
            }, cancellationToken);
        }

        // ChildName left blank — the caller is the child's own session, which
        // already knows who it is; only the parent-facing pending list
        // (GetPendingRedemptionsQuery) actually needs it, and that query path
        // loads it for real via IRewardRepository's Include(Child).
        return new RewardRedemptionDto(
            redemption.Id, redemption.ChildId, string.Empty, reward.Id, reward.Title, reward.CostXp,
            redemption.Status, redemption.RedeemedAt, voucherCode);
    }
}
