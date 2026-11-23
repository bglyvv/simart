using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Economy.Commands.RedeemReward;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.FulfillVoucher;

/// <summary>Marks a voucher collected in person — the loop a QR scan closes.
/// A reward-sourced voucher additionally requires the underlying
/// RewardRedemption to already be "approved": a partner handing over a
/// physical reward before a parent signed off would defeat the whole point
/// of that approval step. A donation-sourced voucher has no such gate —
/// Donate itself is instant/always-confirmed, so there's nothing to wait
/// on.</summary>
public sealed class FulfillVoucherCommandHandler(IVoucherRepository voucherRepository, IRewardRepository rewardRepository)
    : IRequestHandler<FulfillVoucherCommand, VoucherDto>
{
    public async Task<VoucherDto> Handle(FulfillVoucherCommand request, CancellationToken cancellationToken)
    {
        var voucher = await voucherRepository.FindVoucherByCodeAsync(request.Code, cancellationToken)
            ?? throw new VoucherNotFoundException(request.Code);

        if (voucher.PartnerId != request.CallerPartnerId)
            throw new VoucherAccessDeniedException();

        if (voucher.Status == "fulfilled")
            throw new VoucherAlreadyFulfilledException(request.Code);

        if (voucher.SourceType == RedeemRewardCommandHandler.SourceType)
        {
            var redemption = await rewardRepository.FindRedemptionWithRewardAsync(voucher.SourceId, cancellationToken);
            if (redemption is null || redemption.Status != "approved")
                throw new VoucherNotYetApprovedException(request.Code);
        }

        voucher.Status = "fulfilled";
        voucher.FulfilledAt = DateTimeOffset.UtcNow;
        await voucherRepository.UpdateVoucherAsync(voucher, cancellationToken);

        return VoucherDto.FromDomain(voucher);
    }
}
