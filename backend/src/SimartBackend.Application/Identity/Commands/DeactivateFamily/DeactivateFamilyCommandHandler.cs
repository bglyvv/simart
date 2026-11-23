using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Identity.Commands.DeactivateFamily;

public sealed class DeactivateFamilyCommandHandler(IFamilyAccountRepository repository)
    : IRequestHandler<DeactivateFamilyCommand>
{
    public async Task Handle(DeactivateFamilyCommand request, CancellationToken cancellationToken)
    {
        var ok = await repository.DeactivateFamilyAsync(
            request.FamilyId, request.DeactivatedByAdminId, cancellationToken);
        if (!ok)
            throw new FamilyNotFoundException(request.FamilyId);
    }
}
