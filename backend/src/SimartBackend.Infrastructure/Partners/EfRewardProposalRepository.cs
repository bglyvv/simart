using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Partners;
using SimartBackend.Infrastructure.Persistence;

namespace SimartBackend.Infrastructure.Partners;

public sealed class EfRewardProposalRepository(SimartDbContext db) : IRewardProposalRepository
{
    public async Task AddProposalAsync(RewardProposal proposal, CancellationToken cancellationToken)
    {
        db.RewardProposals.Add(proposal);
        await db.SaveChangesAsync(cancellationToken);
    }

    public Task<RewardProposal?> FindProposalAsync(Guid proposalId, CancellationToken cancellationToken) =>
        db.RewardProposals
            .Include(p => p.Partner)
            .Include(p => p.Events)
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

    public async Task<IReadOnlyList<RewardProposal>> GetProposalsForPartnerAsync(Guid partnerId, CancellationToken cancellationToken) =>
        await db.RewardProposals
            .Include(p => p.Partner)
            .Include(p => p.Events)
            .Where(p => p.PartnerId == partnerId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<RewardProposal>> GetAllProposalsAsync(string? status, CancellationToken cancellationToken)
    {
        var query = db.RewardProposals.Include(p => p.Partner).Include(p => p.Events).AsQueryable();
        if (status is not null) query = query.Where(p => p.Status == status);
        return await query.OrderByDescending(p => p.CreatedAt).ToListAsync(cancellationToken);
    }

    // proposal is already tracked (loaded via FindProposalAsync in the same
    // DbContext scope) — same "just save, no explicit Update() call" shape
    // as EfRewardRepository.UpdateRedemptionAsync/EfVoucherRepository.UpdateVoucherAsync.
    public async Task SaveProposalAsync(RewardProposal proposal, CancellationToken cancellationToken) =>
        await db.SaveChangesAsync(cancellationToken);

    public async Task AddEventAsync(RewardProposalEvent proposalEvent, CancellationToken cancellationToken)
    {
        db.RewardProposalEvents.Add(proposalEvent);
        await db.SaveChangesAsync(cancellationToken);
    }
}
