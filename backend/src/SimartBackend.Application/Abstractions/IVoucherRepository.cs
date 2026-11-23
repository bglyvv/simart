using SimartBackend.Domain.Entities.Partners;

namespace SimartBackend.Application.Abstractions;

/// <summary>Where vouchers (the QR-scannable receipt for a reward redemption
/// or a donation) are read and written. Implemented in Infrastructure
/// against SimartDbContext — Application only ever sees this interface.</summary>
public interface IVoucherRepository
{
    Task AddVoucherAsync(Voucher voucher, CancellationToken cancellationToken);

    /// <summary>With `Child` and `Partner` both loaded — GetVoucherQuery/
    /// FulfillVoucherCommand need the child's name and the partner's own id
    /// (for the ownership check) without an extra round trip.</summary>
    Task<Voucher?> FindVoucherByCodeAsync(string code, CancellationToken cancellationToken);

    Task UpdateVoucherAsync(Voucher voucher, CancellationToken cancellationToken);
}
