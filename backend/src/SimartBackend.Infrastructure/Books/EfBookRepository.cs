using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Books;
using SimartBackend.Infrastructure.Persistence;

namespace SimartBackend.Infrastructure.Books;

public sealed class EfBookRepository(SimartDbContext db) : IBookRepository
{
    public async Task<IReadOnlyList<Book>> GetBooksAsync(CancellationToken cancellationToken) =>
        await db.Books
            .AsNoTracking()
            .Include(b => b.StoreLinks)
            .OrderBy(b => b.SortOrder).ThenBy(b => b.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Book>> GetDeletedBooksAsync(CancellationToken cancellationToken) =>
        await db.Books
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Include(b => b.StoreLinks)
            .Where(b => b.IsDeleted)
            .OrderByDescending(b => b.DeletedAt)
            .ToListAsync(cancellationToken);

    public Task<Book?> FindBookAsync(Guid id, CancellationToken cancellationToken) =>
        db.Books.Include(b => b.StoreLinks).FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

    public async Task AddBookAsync(Book book, CancellationToken cancellationToken)
    {
        db.Books.Add(book);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateBookAsync(Book book, IReadOnlyList<BookStoreLink> storeLinks, CancellationToken cancellationToken)
    {
        db.BookStoreLinks.RemoveRange(book.StoreLinks);
        db.BookStoreLinks.AddRange(storeLinks);
        await db.SaveChangesAsync(cancellationToken);
        book.StoreLinks = storeLinks.ToList();
    }

    public async Task<int> GetMaxSortOrderAsync(CancellationToken cancellationToken) =>
        await db.Books.IgnoreQueryFilters().MaxAsync(b => (int?)b.SortOrder, cancellationToken) ?? 0;

    public async Task<IReadOnlyList<Book>> GetBooksForReorderAsync(CancellationToken cancellationToken) =>
        await db.Books.ToListAsync(cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken) => db.SaveChangesAsync(cancellationToken);

    public async Task<bool> SoftDeleteBookAsync(Guid id, Guid deletedByAdminId, CancellationToken cancellationToken)
    {
        var book = await db.Books.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        if (book is null)
            return false;
        book.IsDeleted = true;
        book.DeletedAt = DateTimeOffset.UtcNow;
        book.DeletedBy = deletedByAdminId;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RestoreBookAsync(Guid id, CancellationToken cancellationToken)
    {
        var book = await db.Books.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.Id == id && b.IsDeleted, cancellationToken);
        if (book is null)
            return false;
        book.IsDeleted = false;
        book.DeletedAt = null;
        book.DeletedBy = null;
        // Back at the end of the arch — its old position may have been reused by
        // drag-and-drop reordering while it was deleted.
        book.SortOrder = await GetMaxSortOrderAsync(cancellationToken) + 1;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlySet<Guid>> GetExistingImageIdsAsync(IEnumerable<Guid> ids, CancellationToken cancellationToken)
    {
        var list = ids.ToList();
        var found = await db.BookImages.Where(i => list.Contains(i.Id)).Select(i => i.Id).ToListAsync(cancellationToken);
        return found.ToHashSet();
    }

    public async Task AddImageAsync(BookImage image, CancellationToken cancellationToken)
    {
        db.BookImages.Add(image);
        await db.SaveChangesAsync(cancellationToken);
    }

    public Task<BookImage?> FindImageAsync(Guid id, CancellationToken cancellationToken) =>
        db.BookImages.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
}
