using SimartBackend.Domain.Common;

namespace SimartBackend.Domain.Entities.Books;

/// <summary>One book on the public landing page's book arch, managed from the
/// admin panel's "Kitablar" page. Soft-deletable like every other catalog
/// table — a deleted book drops out of GET /api/books via the global
/// IsDeleted filter and shows up in the admin's "Silinmiş" tab instead.
/// Images live in BookImage (by id) so listing books never loads image bytes.</summary>
public class Book : ISoftDeletable
{
    public Guid Id { get; set; }
    public required string Title { get; set; }
    public required string Category { get; set; }
    public required string AgeRange { get; set; }
    public int PageCount { get; set; }
    public decimal PriceAzn { get; set; }
    public required string About { get; set; }
    public required string Quote { get; set; }
    /// <summary>Printed as the barcode on the back cover. Optional.</summary>
    public string? Isbn { get; set; }
    /// <summary>meadow|forest|space|sea|sunny — the generated back-cover
    /// landscape, used only when no back cover image is uploaded.</summary>
    public required string BackScene { get; set; }
    /// <summary>Position in the arch, ascending.</summary>
    public int SortOrder { get; set; }

    public required string AuthorName { get; set; }
    public required string AuthorBio { get; set; }
    /// <summary>male|female — picks the placeholder avatar when there's no
    /// author photo.</summary>
    public required string AuthorGender { get; set; }

    public Guid CoverImageId { get; set; }
    public Guid? BackCoverImageId { get; set; }
    public Guid? AuthorPhotoImageId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }

    public ICollection<BookStoreLink> StoreLinks { get; set; } = new List<BookStoreLink>();
}

/// <summary>"Haradan əldə etmək olar?" — one shop selling this book.</summary>
public class BookStoreLink
{
    public Guid Id { get; set; }
    public Guid BookId { get; set; }
    public required string Name { get; set; }
    public required string Url { get; set; }
    public int SortOrder { get; set; }

    public Book Book { get; set; } = null!;
}

/// <summary>An uploaded image (cover, back cover or author photo), stored in
/// Postgres because the API host's disk doesn't survive a redeploy. Immutable:
/// replacing a cover uploads a new image and points the book at the new id.</summary>
public class BookImage
{
    public Guid Id { get; set; }
    public required string ContentType { get; set; }
    public required byte[] Data { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
