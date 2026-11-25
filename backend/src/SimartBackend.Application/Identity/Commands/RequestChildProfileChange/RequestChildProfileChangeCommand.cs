using MediatR;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Commands.RequestChildProfileChange;

/// <summary>A child proposing a new name/avatar for themselves — held pending
/// until a parent approves or rejects it (see ChildProfileChangeRequest's
/// doc comment). CallerFamilyId must own ChildId, same shape every other
/// childId-keyed Identity command already uses.</summary>
public sealed record RequestChildProfileChangeCommand(
    Guid CallerFamilyId, Guid ChildId, string NewName, string NewAvatarEmoji) : IRequest<ChildProfileChangeRequestDto>;
