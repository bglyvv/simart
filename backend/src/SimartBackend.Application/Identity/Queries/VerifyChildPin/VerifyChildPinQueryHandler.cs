using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Identity.Queries.VerifyChildPin;

public sealed class VerifyChildPinQueryHandler(
    IFamilyAccountRepository repository, IPasswordHasher passwordHasher)
    : IRequestHandler<VerifyChildPinQuery, bool>
{
    public async Task<bool> Handle(VerifyChildPinQuery request, CancellationToken cancellationToken)
    {
        var child = await repository.FindChildAsync(request.ChildId, cancellationToken)
            ?? throw new ChildAccountNotFoundException(request.ChildId);

        if (child.FamilyId != request.CallerFamilyId)
            throw new ChildAccountAccessDeniedException();

        return child.PinHash is null || passwordHasher.Verify(child.PinHash, request.Pin);
    }
}
