using MediatR;

namespace SimartBackend.Application.Content.Commands.RestoreVideo;

/// <summary>Un-deletes a video from the admin dashboard's "Silinmiş" tab — the
/// reverse of DeleteVideoCommand.</summary>
public sealed record RestoreVideoCommand(string YoutubeVideoId) : IRequest;
