namespace SimartBackend.Domain.Entities.Contact;

/// <summary>A message sent from the public "Əlaqə" page's "Bizə yazın" form,
/// read by an admin on the "Mesajlar" page. Not soft-deletable — there's no
/// delete action yet; ReadAt is the only thing an admin changes.</summary>
public class ContactMessage
{
    public Guid Id { get; set; }
    public required string FullName { get; set; }
    public required string Email { get; set; }
    /// <summary>Company or organization — filled in by the partnership popup; null from the plain form.</summary>
    public string? Organization { get; set; }
    /// <summary>general|partnership|support|feedback — see ContactMessages.Topics.</summary>
    public required string Topic { get; set; }
    public required string Message { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    /// <summary>When an admin marked it read; null while unread.</summary>
    public DateTimeOffset? ReadAt { get; set; }
}
