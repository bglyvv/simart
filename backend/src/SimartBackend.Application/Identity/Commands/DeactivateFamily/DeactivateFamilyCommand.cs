using MediatR;

namespace SimartBackend.Application.Identity.Commands.DeactivateFamily;

/// <summary>Admin-only. Cascades onto every Parent/Child under the family — see
/// IFamilyAccountRepository.DeactivateFamilyAsync. Soft-delete, not a hard delete:
/// ReactivateFamilyCommand undoes it exactly.</summary>
public sealed record DeactivateFamilyCommand(Guid FamilyId, Guid DeactivatedByAdminId) : IRequest;
