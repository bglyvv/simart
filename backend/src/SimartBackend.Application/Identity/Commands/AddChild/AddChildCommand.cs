using MediatR;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Commands.AddChild;

public sealed record AddChildCommand(
    Guid FamilyId,
    string Name,
    string AvatarEmoji,
    string Gender,
    DateOnly DateOfBirth,
    string City) : IRequest<ChildDto>;
