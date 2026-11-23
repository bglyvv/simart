using SimartBackend.Domain.Entities.Economy;

namespace SimartBackend.Application.Abstractions;

/// <summary>Where the donation campaign catalog ("Kimsəsiz Heyvanlara Sığınacaq
/// Dəstəyi" etc. — never soft-deleted, the global query filter handles that;
/// seeded idempotently at startup, same "no admin management UI yet" shape as
/// IRewardRepository/IGameRepository's catalogs) and a child's real pocket-money
/// ledger are read and written. Implemented in Infrastructure against
/// SimartDbContext — Application only ever sees this interface.</summary>
public interface IWalletRepository
{
    Task<IReadOnlyList<DonationCampaign>> GetAllCampaignsAsync(CancellationToken cancellationToken);

    Task<DonationCampaign?> FindCampaignAsync(Guid campaignId, CancellationToken cancellationToken);

    Task AddTransactionAsync(WalletTransaction transaction, CancellationToken cancellationToken);

    /// <summary>This child's most recent transactions, newest first — the
    /// "Əməliyyat Tarixçəsi" list on WalletPage.tsx.</summary>
    Task<IReadOnlyList<WalletTransaction>> GetRecentTransactionsForChildAsync(
        Guid childId, int limit, CancellationToken cancellationToken);

    /// <summary>The real balance: sum of every "in" transaction's AmountAzn
    /// minus every "out" one's — never a mutated counter, same "ledger, not a
    /// field" shape as XpTransaction/GetTotalXpAsync. Loaded and summed in
    /// memory rather than two separate SUM queries — one child's wallet
    /// history is small enough that this is simpler, same reasoning as
    /// IRewardRepository.GetLatestRedemptionsByRewardAsync.</summary>
    Task<decimal> GetBalanceAsync(Guid childId, CancellationToken cancellationToken);
}
