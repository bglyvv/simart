using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Identity.Commands.ReactivateFamily;

public sealed class ReactivateFamilyCommandHandler(IFamilyAccountRepository repository)
    : IRequestHandler<ReactivateFamilyCommand>
{
    public async Task Handle(ReactivateFamilyCommand request, CancellationToken cancellationToken)
    {
        var ok = await repository.ReactivateFamilyAsync(request.FamilyId, cancellationToken);
        if (!ok)
            throw new FamilyNotFoundException(request.FamilyId);
    }
}
