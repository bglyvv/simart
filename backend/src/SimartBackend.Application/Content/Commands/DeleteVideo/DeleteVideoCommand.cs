using MediatR;

namespace SimartBackend.Application.Content.Commands.DeleteVideo;

/// <summary>Soft-deletes a video — it stops showing up anywhere in the family app
/// (the global query filter on Video.IsDeleted handles that) but the row, and
/// anything already referencing it (watch_progress, etc.), stays in the database.
/// DeletedByAdminId is the caller's own adminId claim, same "who did this" trail
/// every other ISoftDeletable row already carries.</summary>
public sealed record DeleteVideoCommand(string YoutubeVideoId, Guid DeletedByAdminId) : IRequest;
