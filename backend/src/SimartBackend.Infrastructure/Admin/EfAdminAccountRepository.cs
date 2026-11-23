using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Infrastructure.Persistence;
using AdminEntity = SimartBackend.Domain.Entities.Admin.Admin;

namespace SimartBackend.Infrastructure.Admin;

public sealed class EfAdminAccountRepository(SimartDbContext db) : IAdminAccountRepository
{
    public Task<AdminEntity?> FindAdminByEmailAsync(string email, CancellationToken cancellationToken) =>
        db.Admins.FirstOrDefaultAsync(a => a.Email == email, cancellationToken);
}
