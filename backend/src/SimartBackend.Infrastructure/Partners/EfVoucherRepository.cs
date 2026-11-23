using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Partners;
using SimartBackend.Infrastructure.Persistence;

namespace SimartBackend.Infrastructure.Partners;

public sealed class EfVoucherRepository(SimartDbContext db) : IVoucherRepository
{
    public async Task AddVoucherAsync(Voucher voucher, CancellationToken cancellationToken)
    {
        db.Vouchers.Add(voucher);
        await db.SaveChangesAsync(cancellationToken);
    }

    public Task<Voucher?> FindVoucherByCodeAsync(string code, CancellationToken cancellationToken) =>
        db.Vouchers
            .Include(v => v.Child)
            .Include(v => v.Partner)
            .FirstOrDefaultAsync(v => v.Code == code, cancellationToken);

    // voucher is already tracked (loaded via FindVoucherByCodeAsync in the
    // same DbContext scope) — same "just save, no explicit Update() call"
    // shape as EfRewardRepository.UpdateRedemptionAsync.
    public async Task UpdateVoucherAsync(Voucher voucher, CancellationToken cancellationToken) =>
        await db.SaveChangesAsync(cancellationToken);
}
