using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Identity.Dtos;
using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Application.Identity.Commands.AddChild;

public sealed class AddChildCommandHandler(IFamilyAccountRepository repository)
    : IRequestHandler<AddChildCommand, ChildDto>
{
    public async Task<ChildDto> Handle(AddChildCommand request, CancellationToken cancellationToken)
    {
        if (!await repository.FamilyExistsAsync(request.FamilyId, cancellationToken))
            throw new FamilyNotFoundException(request.FamilyId);

        var child = new Child
        {
            Id = Guid.NewGuid(),
            FamilyId = request.FamilyId,
            Name = request.Name,
            AvatarEmoji = request.AvatarEmoji,
            Gender = request.Gender,
            DateOfBirth = request.DateOfBirth,
            City = request.City,
        };

        await repository.AddChildAsync(child, cancellationToken);

        return new ChildDto(child.Id, child.FamilyId, child.Name, child.AvatarEmoji, child.Gender, child.DateOfBirth, child.City);
    }
}
