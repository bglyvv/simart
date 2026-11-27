using SimartBackend.Domain.Entities.Contact;

namespace SimartBackend.Application.Abstractions;

/// <summary>Where "Əlaqə" form messages are stored. Implemented in
/// Infrastructure against SimartDbContext.</summary>
public interface IContactMessageRepository
{
    Task AddAsync(ContactMessage message, CancellationToken cancellationToken);

    /// <summary>Every message, newest first.</summary>
    Task<IReadOnlyList<ContactMessage>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Tracked, for changing then SaveChangesAsync.</summary>
    Task<ContactMessage?> FindAsync(Guid id, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
