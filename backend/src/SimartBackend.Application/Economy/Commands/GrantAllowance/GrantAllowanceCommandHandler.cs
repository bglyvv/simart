using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Economy.Dtos;
using SimartBackend.Domain.Entities.Economy;

namespace SimartBackend.Application.Economy.Commands.GrantAllowance;

/// <summary>A parent manually crediting their own child's pocket money — the
/// most literal real version of "Valideyn Cib Pulu", the recurring "in"
/// transaction title WalletPage.tsx's old mock seed data always showed, which
/// nothing ever actually wrote until now. SettingsPage.tsx is where a parent
/// does this, same trust level as CreateFamilyHabitTaskCommand (a parent
/// acting on their own family, not an admin-gated action).
///
/// Deliberately NOT built alongside this: automatically crediting AZN when a
/// child reaches a new league tier or hits a weekly streak (the other two
/// "in" transaction titles the old mock's seed data showed,
/// "Liqa Mükafatı"/"Həftəlik Seriya Bonusu") — those were never wired to any
/// real trigger even in the mock itself (no handler fired them locally
/// either), and building one means reaching into the League-tier/streak
/// domains' own logic, out of scope for "give the wallet a backend."</summary>
public sealed class GrantAllowanceCommandHandler(
    IFamilyAccountRepository familyAccountRepository, IWalletRepository walletRepository)
    : IRequestHandler<GrantAllowanceCommand, WalletTransactionDto>
{
    public const string SourceType = "parent_allowance";

    public async Task<WalletTransactionDto> Handle(GrantAllowanceCommand request, CancellationToken cancellationToken)
    {
        await WalletChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        if (request.AmountAzn < WalletLimits.MinGrantAzn || request.AmountAzn > WalletLimits.MaxGrantAzn)
            throw new InvalidAllowanceAmountException(request.AmountAzn);

        // No separate "grant" record exists (unlike a donation, which points
        // SourceId at the campaign) — this WalletTransaction row is its own
        // source, so it points at itself, same self-referential shape a few
        // other "no dedicated source entity" ledger rows in this backend use.
        var transactionId = Guid.NewGuid();
        var transaction = new WalletTransaction
        {
            Id = transactionId,
            ChildId = request.ChildId,
            Title = "Valideyn Cib Pulu",
            Direction = "in",
            AmountAzn = request.AmountAzn,
            SourceType = SourceType,
            SourceId = transactionId,
            OccurredAt = DateTimeOffset.UtcNow,
        };
        await walletRepository.AddTransactionAsync(transaction, cancellationToken);

        return WalletTransactionDto.FromDomain(transaction);
    }
}
