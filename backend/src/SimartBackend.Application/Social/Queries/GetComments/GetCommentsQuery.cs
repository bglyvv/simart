using MediatR;
using SimartBackend.Application.Social.Dtos;

namespace SimartBackend.Application.Social.Queries.GetComments;

public sealed record GetCommentsQuery(Guid PostId) : IRequest<IReadOnlyList<SocialCommentDto>>;
