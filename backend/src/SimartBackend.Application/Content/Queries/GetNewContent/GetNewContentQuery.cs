using MediatR;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Queries.GetNewContent;

/// <summary>What `POST /api/content/sync` actually runs now — a diff against the
/// real YouTube channel, not an automatic upsert. Named a query (IRequest), not a
/// command, because it never writes anything; it's POST on the Api side only
/// because it triggers real external API calls, not because it mutates state.</summary>
public sealed record GetNewContentQuery : IRequest<IReadOnlyList<DiscoveredVideoDto>>;
