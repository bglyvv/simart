using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Partners;
using SimartBackend.Infrastructure.Persistence;

namespace SimartBackend.Infrastructure.Partners;

public sealed class EfPartnerAccountRepository(SimartDbContext db) : IPartnerAccountRepository
{
    public Task<Partner?> FindPartnerByEmailAsync(string email, CancellationToken cancellationToken) =>
        db.Partners.FirstOrDefaultAsync(p => p.Email == email, cancellationToken);
}
