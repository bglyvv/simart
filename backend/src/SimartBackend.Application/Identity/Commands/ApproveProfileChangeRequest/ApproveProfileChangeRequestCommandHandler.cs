using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Identity.Commands.ApproveProfileChangeRequest;

public sealed class ApproveProfileChangeRequestCommandHandler(IFamilyAccountRepository repository)
    : IRequestHandler<ApproveProfileChangeRequestCommand>
{
    public async Task Handle(ApproveProfileChangeRequestCommand request, CancellationToken cancellationToken)
    {
        var profileRequest = await repository.FindProfileChangeRequestAsync(request.RequestId, cancellationToken)
            ?? throw new ProfileChangeRequestNotFoundException(request.RequestId);

        var child = await repository.FindChildAsync(profileRequest.ChildId, cancellationToken)
            ?? throw new ChildAccountNotFoundException(profileRequest.ChildId);
        if (child.FamilyId != request.CallerFamilyId)
            throw new ChildAccountAccessDeniedException();

        if (profileRequest.Status != "pending")
            throw new ProfileChangeRequestAlreadyResolvedException(request.RequestId);

        await repository.ApproveProfileChangeRequestAsync(request.RequestId, cancellationToken);
    }
}
