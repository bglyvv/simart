using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Queries.GetChildren;

public sealed class GetChildrenQueryHandler(IFamilyAccountRepository repository)
    : IRequestHandler<GetChildrenQuery, IReadOnlyList<ChildDto>>
{
    public async Task<IReadOnlyList<ChildDto>> Handle(GetChildrenQuery request, CancellationToken cancellationToken)
    {
        var children = await repository.GetChildrenAsync(request.FamilyId, cancellationToken);
        return children
            .Select(c => new ChildDto(c.Id, c.FamilyId, c.Name, c.AvatarEmoji, c.Gender, c.DateOfBirth, c.City))
            .ToList();
    }
}
