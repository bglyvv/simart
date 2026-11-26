using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Books;

namespace SimartBackend.Application.Books;

public sealed record BookStoreLinkDto(string Name, string Url);

/// <summary>Image fields are ids — the frontend builds the URL
/// (/api/books/images/{id}), so the backend never needs its own public address.</summary>
public sealed record BookDto(
    Guid Id,
    string Title,
    string Category,
    string AgeRange,
    int PageCount,
    decimal PriceAzn,
    string About,
    string Quote,
    string? Isbn,
    string BackScene,
    int SortOrder,
    string AuthorName,
    string AuthorBio,
    string AuthorGender,
    Guid CoverImageId,
    Guid? BackCoverImageId,
    Guid? AuthorPhotoImageId,
    IReadOnlyList<BookStoreLinkDto> StoreLinks,
    DateTimeOffset? DeletedAt);

/// <summary>Everything an admin edits on a book in the form — shared by Create
/// and Update. Position in the arch isn't here: a new book goes to the end, and
/// the order is changed by drag and drop (ReorderBooksCommand).</summary>
public sealed record BookInput(
    string? Title,
    string? Category,
    string? AgeRange,
    int PageCount,
    decimal PriceAzn,
    string? About,
    string? Quote,
    string? Isbn,
    string? BackScene,
    string? AuthorName,
    string? AuthorBio,
    string? AuthorGender,
    Guid? CoverImageId,
    Guid? BackCoverImageId,
    Guid? AuthorPhotoImageId,
    IReadOnlyList<BookStoreLinkDto>? StoreLinks);

/// <summary>The admin list's drag-and-drop order, first to last.</summary>
public sealed record ReorderBooksRequest(IReadOnlyList<Guid>? Ids);

public sealed class BookNotFoundException(Guid id) : Exception($"Book '{id}' was not found.");

public sealed class BookImageNotFoundException(Guid id) : Exception($"Image '{id}' was not found.");

/// <summary>Mapped to 400.</summary>
public sealed class InvalidBookException(string message) : Exception(message);

public static class BookCatalog
{
    public static readonly string[] Scenes = ["meadow", "forest", "space", "sea", "sunny"];
    public static readonly string[] Genders = ["male", "female"];

    public const int MaxImageBytes = 5 * 1024 * 1024;
    public const int MaxStoreLinks = 8;

    public static BookDto ToDto(Book b) => new(
        b.Id, b.Title, b.Category, b.AgeRange, b.PageCount, b.PriceAzn, b.About, b.Quote, b.Isbn,
        b.BackScene, b.SortOrder, b.AuthorName, b.AuthorBio, b.AuthorGender,
        b.CoverImageId, b.BackCoverImageId, b.AuthorPhotoImageId,
        b.StoreLinks.OrderBy(s => s.SortOrder).Select(s => new BookStoreLinkDto(s.Name, s.Url)).ToList(),
        b.DeletedAt);

    /// <summary>Validates and normalises the input, checks referenced images
    /// exist, and copies it onto book. Returns the new store-link rows.</summary>
    public static async Task<List<BookStoreLink>> ApplyAsync(
        Book book, BookInput input, IBookRepository repository, CancellationToken cancellationToken)
    {
        var title = Required(input.Title, "Kitabın adı", 200);
        var authorName = Required(input.AuthorName, "Müəllifin adı", 120);
        if (input.CoverImageId is not { } coverId)
            throw new InvalidBookException("Üz qabığı şəkli tələb olunur.");
        if (input.PageCount <= 0 || input.PageCount > 10000)
            throw new InvalidBookException("Səhifə sayı müsbət olmalıdır.");
        if (input.PriceAzn < 0 || input.PriceAzn > 100000)
            throw new InvalidBookException("Qiymət mənfi ola bilməz.");
        var scene = input.BackScene?.Trim() ?? "";
        if (!Scenes.Contains(scene))
            throw new InvalidBookException($"Arxa üz mövzusu bunlardan biri olmalıdır: {string.Join(", ", Scenes)}.");
        var gender = input.AuthorGender?.Trim() ?? "";
        if (!Genders.Contains(gender))
            throw new InvalidBookException("Müəllifin cinsi 'male' və ya 'female' olmalıdır.");

        var links = (input.StoreLinks ?? [])
            .Where(l => !string.IsNullOrWhiteSpace(l.Name) || !string.IsNullOrWhiteSpace(l.Url))
            .ToList();
        if (links.Count > MaxStoreLinks)
            throw new InvalidBookException($"Ən çox {MaxStoreLinks} satış yeri əlavə etmək olar.");
        var storeLinks = new List<BookStoreLink>();
        for (var i = 0; i < links.Count; i++)
        {
            var name = Required(links[i].Name, "Satış yerinin adı", 80);
            var url = links[i].Url?.Trim() ?? "";
            if (url.Length > 500
                || !Uri.TryCreate(url, UriKind.Absolute, out var uri)
                || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
                throw new InvalidBookException($"'{name}' üçün link http:// və ya https:// ilə başlamalıdır.");
            storeLinks.Add(new BookStoreLink { Id = Guid.NewGuid(), BookId = book.Id, Name = name, Url = url, SortOrder = i });
        }

        var imageIds = new[] { (Guid?)coverId, input.BackCoverImageId, input.AuthorPhotoImageId }
            .Where(id => id is not null).Select(id => id!.Value).Distinct().ToList();
        var existing = await repository.GetExistingImageIdsAsync(imageIds, cancellationToken);
        var missing = imageIds.FirstOrDefault(id => !existing.Contains(id));
        if (missing != Guid.Empty)
            throw new InvalidBookException($"Şəkil '{missing}' tapılmadı.");

        book.Title = title;
        book.Category = Optional(input.Category, 60);
        book.AgeRange = Optional(input.AgeRange, 30);
        book.PageCount = input.PageCount;
        book.PriceAzn = decimal.Round(input.PriceAzn, 2);
        book.About = Optional(input.About, 2000);
        book.Quote = Optional(input.Quote, 300);
        book.Isbn = string.IsNullOrWhiteSpace(input.Isbn) ? null : Optional(input.Isbn, 20);
        book.BackScene = scene;
        book.AuthorName = authorName;
        book.AuthorBio = Optional(input.AuthorBio, 1000);
        book.AuthorGender = gender;
        book.CoverImageId = coverId;
        book.BackCoverImageId = input.BackCoverImageId;
        book.AuthorPhotoImageId = input.AuthorPhotoImageId;
        book.UpdatedAt = DateTimeOffset.UtcNow;
        return storeLinks;
    }

    private static string Required(string? value, string label, int max)
    {
        var v = value?.Trim() ?? "";
        if (v.Length == 0)
            throw new InvalidBookException($"{label} tələb olunur.");
        if (v.Length > max)
            throw new InvalidBookException($"{label} ən çox {max} simvol ola bilər.");
        return v;
    }

    private static string Optional(string? value, int max)
    {
        var v = value?.Trim() ?? "";
        if (v.Length > max)
            throw new InvalidBookException($"Mətn ən çox {max} simvol ola bilər.");
        return v;
    }

    /// <summary>Content type from the file's own first bytes — never the
    /// declared one. Only JPEG/PNG/WebP; null for anything else.</summary>
    public static string? DetectImageType(ReadOnlySpan<byte> data)
    {
        if (data.Length >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF)
            return "image/jpeg";
        if (data.Length >= 8 && data[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
            return "image/png";
        if (data.Length >= 12 && data[..4].SequenceEqual("RIFF"u8) && data[8..12].SequenceEqual("WEBP"u8))
            return "image/webp";
        return null;
    }
}
