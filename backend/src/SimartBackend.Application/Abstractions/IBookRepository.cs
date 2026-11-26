using SimartBackend.Domain.Entities.Books;

namespace SimartBackend.Application.Abstractions;

/// <summary>Where landing-page books and their images are read and written.
/// Implemented in Infrastructure against SimartDbContext.</summary>
public interface IBookRepository
{
    /// <summary>Active books with StoreLinks loaded, ordered by SortOrder then CreatedAt.</summary>
    Task<IReadOnlyList<Book>> GetBooksAsync(CancellationToken cancellationToken);

    /// <summary>Soft-deleted books with StoreLinks loaded, most recently deleted first.</summary>
    Task<IReadOnlyList<Book>> GetDeletedBooksAsync(CancellationToken cancellationToken);

    /// <summary>An active book, tracked, with StoreLinks loaded.</summary>
    Task<Book?> FindBookAsync(Guid id, CancellationToken cancellationToken);

    Task AddBookAsync(Book book, CancellationToken cancellationToken);

    /// <summary>book is already tracked (from FindBookAsync); replaces its store
    /// links with the given ones and saves.</summary>
    Task UpdateBookAsync(Book book, IReadOnlyList<BookStoreLink> storeLinks, CancellationToken cancellationToken);

    /// <summary>Highest SortOrder among all books, deleted ones included (so a
    /// restored book can't collide), or 0 when there are none.</summary>
    Task<int> GetMaxSortOrderAsync(CancellationToken cancellationToken);

    /// <summary>Active books, tracked, for changing SortOrder then SaveChangesAsync.</summary>
    Task<IReadOnlyList<Book>> GetBooksForReorderAsync(CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);

    Task<bool> SoftDeleteBookAsync(Guid id, Guid deletedByAdminId, CancellationToken cancellationToken);

    Task<bool> RestoreBookAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Which of the given ids exist as images.</summary>
    Task<IReadOnlySet<Guid>> GetExistingImageIdsAsync(IEnumerable<Guid> ids, CancellationToken cancellationToken);

    Task AddImageAsync(BookImage image, CancellationToken cancellationToken);

    Task<BookImage?> FindImageAsync(Guid id, CancellationToken cancellationToken);
}
