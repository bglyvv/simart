using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Economy;
using SimartBackend.Infrastructure.Persistence;

namespace SimartBackend.Infrastructure.Economy;

public sealed class EfWalletRepository(SimartDbContext db) : IWalletRepository
{
    public async Task<IReadOnlyList<DonationCampaign>> GetAllCampaignsAsync(CancellationToken cancellationToken) =>
        await db.DonationCampaigns.OrderBy(c => c.XpCost).ToListAsync(cancellationToken);

    public Task<DonationCampaign?> FindCampaignAsync(Guid campaignId, CancellationToken cancellationToken) =>
        db.DonationCampaigns.FirstOrDefaultAsync(c => c.Id == campaignId, cancellationToken);

    public async Task AddTransactionAsync(WalletTransaction transaction, CancellationToken cancellationToken)
    {
        db.WalletTransactions.Add(transaction);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<WalletTransaction>> GetRecentTransactionsForChildAsync(
        Guid childId, int limit, CancellationToken cancellationToken) =>
        await db.WalletTransactions
            .Where(t => t.ChildId == childId)
            .OrderByDescending(t => t.OccurredAt)
            .Take(limit)
            .ToListAsync(cancellationToken);

    // One child's wallet history is small enough to load in full and sum in
    // memory — same "simpler than asking the database to do it" reasoning as
    // IHabitCatalogRepository.GetCompletionDatesAsync. The mock's own seed
    // data confirms this is the intended formula: its static balance (15.50)
    // equals exactly sum(in) - sum(out) over its seed transactions (24.00 -
    // 8.50), even though the old frontend donate() never actually kept that
    // invariant live — this repository is what finally does.
    public async Task<decimal> GetBalanceAsync(Guid childId, CancellationToken cancellationToken)
    {
        var amounts = await db.WalletTransactions
            .Where(t => t.ChildId == childId)
            .Select(t => new { t.Direction, t.AmountAzn })
            .ToListAsync(cancellationToken);

        return amounts.Sum(t => t.Direction == "in" ? t.AmountAzn : -t.AmountAzn);
    }
}
