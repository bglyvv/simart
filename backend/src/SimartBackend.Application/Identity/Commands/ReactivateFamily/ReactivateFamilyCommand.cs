using MediatR;

namespace SimartBackend.Application.Identity.Commands.ReactivateFamily;

public sealed record ReactivateFamilyCommand(Guid FamilyId) : IRequest;
