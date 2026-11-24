using System.Text.RegularExpressions;
using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Identity.Commands.ChangePin;

public sealed partial class ChangePinCommandHandler(
    IFamilyAccountRepository repository, IPasswordHasher passwordHasher)
    : IRequestHandler<ChangePinCommand>
{
    public async Task Handle(ChangePinCommand request, CancellationToken cancellationToken)
    {
        if (!FourDigits().IsMatch(request.NewPin))
            throw new InvalidPinFormatException();

        var parent = await repository.FindParentByIdAsync(request.CallerParentId, cancellationToken);
        if (parent is null)
            throw new ParentNotFoundException(request.CallerParentId);

        if (!passwordHasher.Verify(parent.PinHash, request.CurrentPin))
            throw new IncorrectPinException();

        await repository.ChangeParentPinAsync(request.CallerParentId, passwordHasher.Hash(request.NewPin), cancellationToken);
    }

    [GeneratedRegex(@"^\d{4}$")]
    private static partial Regex FourDigits();
}
