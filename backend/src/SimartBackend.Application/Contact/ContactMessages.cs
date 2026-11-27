using System.Net.Mail;
using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Contact;

namespace SimartBackend.Application.Contact;

/// <summary>What the public form posts. Website is a honeypot: a hidden field
/// people never see, so anything in it means a bot — the message is dropped
/// silently (the bot still gets a success response).</summary>
public sealed record ContactMessageInput(string? FullName, string? Email, string? Topic, string? Message, string? Website, string? Organization = null);

public sealed record ContactMessageDto(
    Guid Id, string FullName, string Email, string? Organization, string Topic, string Message,
    DateTimeOffset CreatedAt, DateTimeOffset? ReadAt);

/// <summary>Validation failure; the message is Azerbaijani and shown to the
/// visitor as-is.</summary>
public sealed class InvalidContactMessageException(string message) : Exception(message);

public sealed class ContactMessageNotFoundException(Guid id) : Exception($"Contact message {id} not found.");

public static class ContactMessages
{
    public static readonly IReadOnlySet<string> Topics =
        new HashSet<string> { "general", "partnership", "support", "feedback" };

    public const int MaxNameLength = 100;
    public const int MaxEmailLength = 200;
    public const int MaxOrganizationLength = 150;
    public const int MinMessageLength = 10;
    public const int MaxMessageLength = 2000;

    public static ContactMessageDto ToDto(ContactMessage m) =>
        new(m.Id, m.FullName, m.Email, m.Organization, m.Topic, m.Message, m.CreatedAt, m.ReadAt);

    public static bool IsValidEmail(string email) =>
        MailAddress.TryCreate(email, out var address)
        && address.Address == email
        && email.Contains('.', StringComparison.Ordinal);
}

public sealed record SendContactMessageCommand(ContactMessageInput Input) : IRequest;

public sealed class SendContactMessageCommandHandler(IContactMessageRepository repository)
    : IRequestHandler<SendContactMessageCommand>
{
    public async Task Handle(SendContactMessageCommand request, CancellationToken cancellationToken)
    {
        var input = request.Input;
        if (!string.IsNullOrWhiteSpace(input.Website))
            return; // honeypot filled in — a bot

        var name = input.FullName?.Trim() ?? "";
        var email = input.Email?.Trim() ?? "";
        var topic = input.Topic?.Trim() ?? "";
        var message = input.Message?.Trim() ?? "";
        var organization = string.IsNullOrWhiteSpace(input.Organization) ? null : input.Organization.Trim();

        if (name.Length < 2 || name.Length > ContactMessages.MaxNameLength)
            throw new InvalidContactMessageException("Ad və soyadınızı daxil edin.");
        if (email.Length > ContactMessages.MaxEmailLength || !ContactMessages.IsValidEmail(email))
            throw new InvalidContactMessageException("Düzgün e-poçt ünvanı daxil edin.");
        if (organization is { Length: > ContactMessages.MaxOrganizationLength })
            throw new InvalidContactMessageException("Şirkət adı 150 simvoldan uzun ola bilməz.");
        if (!ContactMessages.Topics.Contains(topic))
            throw new InvalidContactMessageException("Mövzunu seçin.");
        if (message.Length < ContactMessages.MinMessageLength)
            throw new InvalidContactMessageException("Mesajınız ən azı 10 simvol olmalıdır.");
        if (message.Length > ContactMessages.MaxMessageLength)
            throw new InvalidContactMessageException("Mesajınız 2000 simvoldan uzun ola bilməz.");

        await repository.AddAsync(new ContactMessage
        {
            Id = Guid.NewGuid(),
            FullName = name,
            Email = email,
            Organization = organization,
            Topic = topic,
            Message = message,
            CreatedAt = DateTimeOffset.UtcNow,
        }, cancellationToken);
    }
}

/// <summary>The admin's "Mesajlar" page.</summary>
public sealed record GetContactMessagesQuery : IRequest<IReadOnlyList<ContactMessageDto>>;

public sealed class GetContactMessagesQueryHandler(IContactMessageRepository repository)
    : IRequestHandler<GetContactMessagesQuery, IReadOnlyList<ContactMessageDto>>
{
    public async Task<IReadOnlyList<ContactMessageDto>> Handle(GetContactMessagesQuery request, CancellationToken cancellationToken) =>
        (await repository.GetAllAsync(cancellationToken)).Select(ContactMessages.ToDto).ToList();
}

/// <summary>Idempotent — marking an already-read message keeps its first ReadAt.</summary>
public sealed record MarkContactMessageReadCommand(Guid Id) : IRequest;

public sealed class MarkContactMessageReadCommandHandler(IContactMessageRepository repository)
    : IRequestHandler<MarkContactMessageReadCommand>
{
    public async Task Handle(MarkContactMessageReadCommand request, CancellationToken cancellationToken)
    {
        var message = await repository.FindAsync(request.Id, cancellationToken)
            ?? throw new ContactMessageNotFoundException(request.Id);
        if (message.ReadAt is not null)
            return;
        message.ReadAt = DateTimeOffset.UtcNow;
        await repository.SaveChangesAsync(cancellationToken);
    }
}
