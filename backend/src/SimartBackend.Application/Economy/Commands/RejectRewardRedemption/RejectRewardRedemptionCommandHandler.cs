using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Economy.Commands.RedeemReward;
using SimartBackend.Application.Economy.Dtos;
using SimartBackend.Domain.Entities.Economy;

namespace SimartBackend.Application.Economy.Commands.RejectRewardRedemption;

public sealed class RejectRewardRedemptionCommandHandler(
    IFamilyAccountRepository familyAccountRepository, IRewardRepository rewardRepository, IHabitCatalogRepository xpLedger)
    : IRequestHandler<RejectRewardRedemptionCommand, RewardRedemptionDto>
{
    public async Task<RewardRedemptionDto> Handle(RejectRewardRedemptionCommand request, CancellationToken cancellationToken)
    {
        var redemption = await rewardRepository.FindRedemptionWithRewardAsync(request.RedemptionId, cancellationToken)
            ?? throw new RedemptionNotFoundException(request.RedemptionId);

        await RewardChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, redemption.ChildId, cancellationToken);

        if (redemption.Status != "pending")
            throw new RedemptionAlreadyResolvedException(request.RedemptionId);

        redemption.Status = "rejected";
        redemption.ApprovedByParentId = request.CallerParentId;
        await rewardRepository.UpdateRedemptionAsync(redemption, cancellationToken);

        // Refund the XP RedeemRewardCommand debited up front — a rejected
        // request shouldn't permanently cost the child anything.
        await xpLedger.AddXpTransactionAsync(new XpTransaction
        {
            Id = Guid.NewGuid(),
            ChildId = redemption.ChildId,
            Amount = redemption.Reward.CostXp,
            Reason = $"Mükafat ləğv edildi: {redemption.Reward.Title}",
            SourceType = RedeemRewardCommandHandler.SourceType,
            SourceId = redemption.Id,
            CreatedAt = DateTimeOffset.UtcNow,
        }, cancellationToken);

        return RewardRedemptionDto.FromDomain(redemption);
    }
}
