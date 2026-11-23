using SimartBackend.Domain.Entities.Partners;

namespace SimartBackend.Application.Abstractions;

/// <summary>Where partner reward proposals and their event history are read
/// and written. Implemented in Infrastructure against SimartDbContext —
/// Application only ever sees this interface.</summary>
public interface IRewardProposalRepository
{
    Task AddProposalAsync(RewardProposal proposal, CancellationToken cancellationToken);

    /// <summary>With `Partner` and `Events` both loaded, `Events` ordered
    /// oldest first — every handler and both list queries need the full
    /// history, not just the current row.</summary>
    Task<RewardProposal?> FindProposalAsync(Guid proposalId, CancellationToken cancellationToken);

    /// <summary>This partner's own proposals, newest first, same loading
    /// shape as FindProposalAsync.</summary>
    Task<IReadOnlyList<RewardProposal>> GetProposalsForPartnerAsync(Guid partnerId, CancellationToken cancellationToken);

    /// <summary>Every proposal across every partner, newest first — the
    /// admin review queue. `status` filters to one status when given.</summary>
    Task<IReadOnlyList<RewardProposal>> GetAllProposalsAsync(string? status, CancellationToken cancellationToken);

    /// <summary>proposal is already tracked (loaded via FindProposalAsync in
    /// the same DbContext scope) — just persists whatever changed on it.</summary>
    Task SaveProposalAsync(RewardProposal proposal, CancellationToken cancellationToken);

    Task AddEventAsync(RewardProposalEvent proposalEvent, CancellationToken cancellationToken);
}
