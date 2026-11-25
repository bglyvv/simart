using System.Text.RegularExpressions;
using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Identity.Commands.SetChildPin;

public sealed partial class SetChildPinCommandHandler(
    IFamilyAccountRepository repository, IPasswordHasher passwordHasher)
    : IRequestHandler<SetChildPinCommand>
{
    public async Task Handle(SetChildPinCommand request, CancellationToken cancellationToken)
    {
        var child = await repository.FindChildAsync(request.ChildId, cancellationToken)
            ?? throw new ChildAccountNotFoundException(request.ChildId);

        if (child.FamilyId != request.CallerFamilyId)
            throw new ChildAccountAccessDeniedException();

        if (request.NewPin is null)
        {
            await repository.SetChildPinAsync(request.ChildId, null, cancellationToken);
            return;
        }

        if (!FourDigits().IsMatch(request.NewPin))
            throw new InvalidPinFormatException();

        await repository.SetChildPinAsync(request.ChildId, passwordHasher.Hash(request.NewPin), cancellationToken);
    }

    [GeneratedRegex(@"^\d{4}$")]
    private static partial Regex FourDigits();
}
