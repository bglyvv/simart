using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Contact;
using SimartBackend.Infrastructure.Persistence;

namespace SimartBackend.Infrastructure.Contact;

public sealed class EfContactMessageRepository(SimartDbContext db) : IContactMessageRepository
{
    public async Task AddAsync(ContactMessage message, CancellationToken cancellationToken)
    {
        db.ContactMessages.Add(message);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ContactMessage>> GetAllAsync(CancellationToken cancellationToken) =>
        await db.ContactMessages.AsNoTracking().OrderByDescending(m => m.CreatedAt).ToListAsync(cancellationToken);

    public Task<ContactMessage?> FindAsync(Guid id, CancellationToken cancellationToken) =>
        db.ContactMessages.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken) => db.SaveChangesAsync(cancellationToken);
}
