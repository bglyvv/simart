using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Social.Dtos;

namespace SimartBackend.Application.Social.Queries.GetComments;

public sealed class GetCommentsQueryHandler(ISocialRepository socialRepository)
    : IRequestHandler<GetCommentsQuery, IReadOnlyList<SocialCommentDto>>
{
    public async Task<IReadOnlyList<SocialCommentDto>> Handle(GetCommentsQuery request, CancellationToken cancellationToken)
    {
        if (await socialRepository.FindPostAsync(request.PostId, cancellationToken) is null)
            throw new SocialPostNotFoundException(request.PostId);

        var comments = await socialRepository.GetCommentsForPostAsync(request.PostId, cancellationToken);

        return comments
            .Select(c => new SocialCommentDto(
                c.Id, c.PostId, c.ChildId, SocialHandle.Generate(c.ChildId), c.Child.AvatarEmoji,
                c.Body, c.ParentCommentId, c.CreatedAt))
            .ToList();
    }
}
