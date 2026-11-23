using MediatR;

namespace SimartBackend.Application.Identity.Commands.UpdateChild;

/// <summary>Admin-only edit — Name and City only. AvatarEmoji/Gender/DateOfBirth
/// aren't editable here — a typo in a name or city is the realistic case this
/// covers, not re-profiling a child.</summary>
public sealed record UpdateChildCommand(Guid ChildId, string Name, string City) : IRequest;
