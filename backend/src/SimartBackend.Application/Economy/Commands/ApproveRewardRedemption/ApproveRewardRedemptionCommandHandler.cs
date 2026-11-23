using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Commands.ApproveRewardRedemption;

public sealed class ApproveRewardRedemptionCommandHandler(
    IFamilyAccountRepository familyAccountRepository, IRewardRepository rewardRepository)
    : IRequestHandler<ApproveRewardRedemptionCommand, RewardRedemptionDto>
{
    public async Task<RewardRedemptionDto> Handle(ApproveRewardRedemptionCommand request, CancellationToken cancellationToken)
    {
        var redemption = await rewardRepository.FindRedemptionWithRewardAsync(request.RedemptionId, cancellationToken)
            ?? throw new RedemptionNotFoundException(request.RedemptionId);

        await RewardChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, redemption.ChildId, cancellationToken);

        if (redemption.Status != "pending")
            throw new RedemptionAlreadyResolvedException(request.RedemptionId);

        // No XP change here — RedeemRewardCommand already debited it up front
        // (see that handler's doc comment); approving just confirms the spend.
        redemption.Status = "approved";
        redemption.ApprovedByParentId = request.CallerParentId;
        await rewardRepository.UpdateRedemptionAsync(redemption, cancellationToken);

        return RewardRedemptionDto.FromDomain(redemption);
    }
}
