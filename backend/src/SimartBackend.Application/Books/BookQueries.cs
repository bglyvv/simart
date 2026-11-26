using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Books;

namespace SimartBackend.Application.Books;

/// <summary>The landing page's book arch (open) and the admin's "Kitablar" list.</summary>
public sealed record GetBooksQuery : IRequest<IReadOnlyList<BookDto>>;

public sealed class GetBooksQueryHandler(IBookRepository repository)
    : IRequestHandler<GetBooksQuery, IReadOnlyList<BookDto>>
{
    public async Task<IReadOnlyList<BookDto>> Handle(GetBooksQuery request, CancellationToken cancellationToken) =>
        (await repository.GetBooksAsync(cancellationToken)).Select(BookCatalog.ToDto).ToList();
}

/// <summary>The admin's "Silinmiş" tab.</summary>
public sealed record GetDeletedBooksQuery : IRequest<IReadOnlyList<BookDto>>;

public sealed class GetDeletedBooksQueryHandler(IBookRepository repository)
    : IRequestHandler<GetDeletedBooksQuery, IReadOnlyList<BookDto>>
{
    public async Task<IReadOnlyList<BookDto>> Handle(GetDeletedBooksQuery request, CancellationToken cancellationToken) =>
        (await repository.GetDeletedBooksAsync(cancellationToken)).Select(BookCatalog.ToDto).ToList();
}

public sealed record GetBookImageQuery(Guid Id) : IRequest<BookImage>;

public sealed class GetBookImageQueryHandler(IBookRepository repository)
    : IRequestHandler<GetBookImageQuery, BookImage>
{
    public async Task<BookImage> Handle(GetBookImageQuery request, CancellationToken cancellationToken) =>
        await repository.FindImageAsync(request.Id, cancellationToken)
            ?? throw new BookImageNotFoundException(request.Id);
}
