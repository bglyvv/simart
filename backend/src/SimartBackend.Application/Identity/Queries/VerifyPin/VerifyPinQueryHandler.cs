using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Identity.Queries.VerifyPin;

public sealed class VerifyPinQueryHandler(
    IFamilyAccountRepository repository, IPasswordHasher passwordHasher)
    : IRequestHandler<VerifyPinQuery, bool>
{
    public async Task<bool> Handle(VerifyPinQuery request, CancellationToken cancellationToken)
    {
        var parent = await repository.FindParentByIdAsync(request.CallerParentId, cancellationToken);
        if (parent is null)
            return false;

        return passwordHasher.Verify(parent.PinHash, request.Pin);
    }
}
