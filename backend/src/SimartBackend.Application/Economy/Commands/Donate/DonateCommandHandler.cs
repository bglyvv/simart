using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Economy.Dtos;
using SimartBackend.Application.Partners;
using SimartBackend.Domain.Entities.Economy;
using SimartBackend.Domain.Entities.Partners;

namespace SimartBackend.Application.Economy.Commands.Donate;

/// <summary>Faithfully ports WalletPage.tsx's old local-only `donate()`: it
/// spends real XP (via the same XpTransaction ledger Habits/Games already
/// write to and RedeemReward already spends from) AND logs a real AZN "out"
/// wallet entry for the sponsor-matched amount — even though the actual money
/// moves from the sponsor to the charity, not out of the child's own saved
/// balance. This is the mock's own existing design (confirmed by its seed
/// data's arithmetic — see GetBalanceAsync's doc comment), not reinterpreted
/// here; repeatable, with no "already donated" dedupe, same as the mock.</summary>
public sealed class DonateCommandHandler(
    IFamilyAccountRepository familyAccountRepository, IWalletRepository walletRepository,
    IHabitCatalogRepository xpLedger, IVoucherRepository voucherRepository)
    : IRequestHandler<DonateCommand, DonationResultDto>
{
    public const string SourceType = "donation";

    public async Task<DonationResultDto> Handle(DonateCommand request, CancellationToken cancellationToken)
    {
        await WalletChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var campaign = await walletRepository.FindCampaignAsync(request.CampaignId, cancellationToken)
            ?? throw new DonationCampaignNotFoundException(request.CampaignId);

        var totalXp = await xpLedger.GetTotalXpAsync(request.ChildId, cancellationToken);
        if (totalXp < campaign.XpCost)
            throw new InsufficientXpException(campaign.XpCost, totalXp);

        // The WalletTransaction is the primary, user-facing record — written
        // first, same order CompleteHabitTaskCommandHandler uses for its own
        // completion row — so the XpTransaction's SourceId below can point at
        // it (this donation event), rather than a third, otherwise-unused
        // correlation Guid. The WalletTransaction's own SourceId points at the
        // campaign itself — "why this AZN amount", the same role
        // RewardRedemption.RewardId plays for an XpTransaction there.
        var transaction = new WalletTransaction
        {
            Id = Guid.NewGuid(),
            ChildId = request.ChildId,
            Title = campaign.Title,
            Direction = "out",
            AmountAzn = campaign.AznAmount,
            SourceType = SourceType,
            SourceId = campaign.Id,
            OccurredAt = DateTimeOffset.UtcNow,
        };
        await walletRepository.AddTransactionAsync(transaction, cancellationToken);

        await xpLedger.AddXpTransactionAsync(new XpTransaction
        {
            Id = Guid.NewGuid(),
            ChildId = request.ChildId,
            Amount = -campaign.XpCost,
            Reason = $"İanə: {campaign.Title}",
            SourceType = SourceType,
            SourceId = transaction.Id,
            CreatedAt = DateTimeOffset.UtcNow,
        }, cancellationToken);

        // Only created when this campaign has a real partner behind it (the
        // bank actually confirming the sponsor-matched transfer) — a
        // donation-sourced voucher has no approval gate to wait on, unlike a
        // reward-sourced one, since Donate itself is instant/always-confirmed.
        string? voucherCode = null;
        if (campaign.PartnerId is Guid partnerId)
        {
            voucherCode = VoucherCodeGenerator.Generate();
            await voucherRepository.AddVoucherAsync(new Voucher
            {
                Id = Guid.NewGuid(),
                Code = voucherCode,
                ChildId = request.ChildId,
                PartnerId = partnerId,
                SourceType = SourceType,
                SourceId = transaction.Id,
                Title = campaign.Title,
                Status = "pending",
                CreatedAt = DateTimeOffset.UtcNow,
            }, cancellationToken);
        }

        var newBalance = await walletRepository.GetBalanceAsync(request.ChildId, cancellationToken);
        return new DonationResultDto(transaction.Id, campaign.Title, campaign.XpCost, campaign.AznAmount, newBalance, voucherCode);
    }
}
