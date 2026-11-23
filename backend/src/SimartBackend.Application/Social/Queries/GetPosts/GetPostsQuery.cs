using MediatR;
using SimartBackend.Application.Social.Dtos;

namespace SimartBackend.Application.Social.Queries.GetPosts;

/// <summary>ChildId is only used to compute LikedByMe on each post — the feed
/// itself is cross-family (see ISocialRepository's doc comment), so this
/// still checks the caller owns ChildId (can't ask "what has child X liked"
/// for a child outside your own family) without scoping the posts returned.</summary>
public sealed record GetPostsQuery(Guid CallerFamilyId, Guid ChildId, int Limit) : IRequest<IReadOnlyList<SocialPostDto>>;
