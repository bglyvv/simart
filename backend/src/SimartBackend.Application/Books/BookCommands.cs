using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Books;

namespace SimartBackend.Application.Books;

public sealed record CreateBookCommand(BookInput Input) : IRequest<BookDto>;

public sealed class CreateBookCommandHandler(IBookRepository repository) : IRequestHandler<CreateBookCommand, BookDto>
{
    public async Task<BookDto> Handle(CreateBookCommand request, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "", Category = "", AgeRange = "", About = "", Quote = "", BackScene = "",
            AuthorName = "", AuthorBio = "", AuthorGender = "",
            CreatedAt = now,
        };
        var links = await BookCatalog.ApplyAsync(book, request.Input, repository, cancellationToken);
        book.StoreLinks = links;
        book.SortOrder = await repository.GetMaxSortOrderAsync(cancellationToken) + 1; // end of the arch
        await repository.AddBookAsync(book, cancellationToken);
        return BookCatalog.ToDto(book);
    }
}

/// <summary>Full replace, store links included.</summary>
public sealed record UpdateBookCommand(Guid Id, BookInput Input) : IRequest<BookDto>;

public sealed class UpdateBookCommandHandler(IBookRepository repository) : IRequestHandler<UpdateBookCommand, BookDto>
{
    public async Task<BookDto> Handle(UpdateBookCommand request, CancellationToken cancellationToken)
    {
        var book = await repository.FindBookAsync(request.Id, cancellationToken)
            ?? throw new BookNotFoundException(request.Id);
        var links = await BookCatalog.ApplyAsync(book, request.Input, repository, cancellationToken);
        await repository.UpdateBookAsync(book, links, cancellationToken);
        return BookCatalog.ToDto(book);
    }
}

/// <summary>Sets the arch order from the admin list's drag and drop. Ids must be
/// exactly the active books, each once — anything else is a stale list (e.g.
/// another tab deleted a book meanwhile) and is rejected rather than half-applied.</summary>
public sealed record ReorderBooksCommand(IReadOnlyList<Guid> Ids) : IRequest;

public sealed class ReorderBooksCommandHandler(IBookRepository repository) : IRequestHandler<ReorderBooksCommand>
{
    public async Task Handle(ReorderBooksCommand request, CancellationToken cancellationToken)
    {
        var books = await repository.GetBooksForReorderAsync(cancellationToken);
        var ids = request.Ids;
        if (ids.Count != books.Count || ids.Distinct().Count() != ids.Count || !books.All(b => ids.Contains(b.Id)))
            throw new InvalidBookException("Kitab siyahısı köhnəlib — səhifəni yeniləyib yenidən cəhd edin.");

        var byId = books.ToDictionary(b => b.Id);
        for (var i = 0; i < ids.Count; i++)
            byId[ids[i]].SortOrder = i + 1;
        await repository.SaveChangesAsync(cancellationToken);
    }
}

public sealed record DeleteBookCommand(Guid Id, Guid DeletedByAdminId) : IRequest;

public sealed class DeleteBookCommandHandler(IBookRepository repository) : IRequestHandler<DeleteBookCommand>
{
    public async Task Handle(DeleteBookCommand request, CancellationToken cancellationToken)
    {
        if (!await repository.SoftDeleteBookAsync(request.Id, request.DeletedByAdminId, cancellationToken))
            throw new BookNotFoundException(request.Id);
    }
}

public sealed record RestoreBookCommand(Guid Id) : IRequest;

public sealed class RestoreBookCommandHandler(IBookRepository repository) : IRequestHandler<RestoreBookCommand>
{
    public async Task Handle(RestoreBookCommand request, CancellationToken cancellationToken)
    {
        if (!await repository.RestoreBookAsync(request.Id, cancellationToken))
            throw new BookNotFoundException(request.Id);
    }
}

public sealed record UploadedBookImageDto(Guid Id);

/// <summary>Accepts JPEG/PNG/WebP up to 5 MB, identified by the file's own
/// bytes — the declared content type is ignored.</summary>
public sealed record UploadBookImageCommand(byte[] Data) : IRequest<UploadedBookImageDto>;

public sealed class UploadBookImageCommandHandler(IBookRepository repository)
    : IRequestHandler<UploadBookImageCommand, UploadedBookImageDto>
{
    public async Task<UploadedBookImageDto> Handle(UploadBookImageCommand request, CancellationToken cancellationToken)
    {
        if (request.Data.Length == 0)
            throw new InvalidBookException("Fayl boşdur.");
        if (request.Data.Length > BookCatalog.MaxImageBytes)
            throw new InvalidBookException("Şəkil 5 MB-dan böyük ola bilməz.");
        var contentType = BookCatalog.DetectImageType(request.Data)
            ?? throw new InvalidBookException("Yalnız JPEG, PNG və ya WebP şəkil yükləmək olar.");

        var image = new BookImage
        {
            Id = Guid.NewGuid(),
            ContentType = contentType,
            Data = request.Data,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        await repository.AddImageAsync(image, cancellationToken);
        return new UploadedBookImageDto(image.Id);
    }
}
