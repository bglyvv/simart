using MediatR;
using SimartBackend.Application.Content.Dtos;

namespace SimartBackend.Application.Content.Queries.GetDeletedVideos;

/// <summary>The admin dashboard's "Silinmiş" tab — read-only, no restore endpoint
/// exists yet.</summary>
public sealed record GetDeletedVideosQuery : IRequest<IReadOnlyList<DeletedVideoDto>>;
