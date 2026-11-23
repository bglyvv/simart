using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Identity.Commands.UpdateParent;

public sealed class UpdateParentCommandHandler(IFamilyAccountRepository repository)
    : IRequestHandler<UpdateParentCommand>
{
    public async Task Handle(UpdateParentCommand request, CancellationToken cancellationToken)
    {
        var fullName = request.FullName.Trim();
        if (fullName.Length == 0)
            throw new InvalidParentNameException();

        var ok = await repository.UpdateParentNameAsync(request.ParentId, fullName, cancellationToken);
        if (!ok)
            throw new ParentNotFoundException(request.ParentId);
    }
}
