using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Identity.Commands.RejectProfileChangeRequest;

public sealed class RejectProfileChangeRequestCommandHandler(IFamilyAccountRepository repository)
    : IRequestHandler<RejectProfileChangeRequestCommand>
{
    public async Task Handle(RejectProfileChangeRequestCommand request, CancellationToken cancellationToken)
    {
        var profileRequest = await repository.FindProfileChangeRequestAsync(request.RequestId, cancellationToken)
            ?? throw new ProfileChangeRequestNotFoundException(request.RequestId);

        var child = await repository.FindChildAsync(profileRequest.ChildId, cancellationToken)
            ?? throw new ChildAccountNotFoundException(profileRequest.ChildId);
        if (child.FamilyId != request.CallerFamilyId)
            throw new ChildAccountAccessDeniedException();

        if (profileRequest.Status != "pending")
            throw new ProfileChangeRequestAlreadyResolvedException(request.RequestId);

        await repository.RejectProfileChangeRequestAsync(request.RequestId, cancellationToken);
    }
}
