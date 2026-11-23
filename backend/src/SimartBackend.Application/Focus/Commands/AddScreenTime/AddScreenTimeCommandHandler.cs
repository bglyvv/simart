using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Focus.Dtos;

namespace SimartBackend.Application.Focus.Commands.AddScreenTime;

public sealed class AddScreenTimeCommandHandler(
    IFamilyAccountRepository familyAccountRepository, IFocusRepository focusRepository)
    : IRequestHandler<AddScreenTimeCommand, ScreenTimeDto>
{
    public async Task<ScreenTimeDto> Handle(AddScreenTimeCommand request, CancellationToken cancellationToken)
    {
        await FocusChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        if (request.SecondsDelta < 1 || request.SecondsDelta > ScreenTimeLimits.MaxDeltaSeconds)
            throw new InvalidScreenTimeDeltaException(request.SecondsDelta);

        var total = await focusRepository.AddScreenTimeAsync(
            request.ChildId, request.Date, request.SecondsDelta, cancellationToken);

        return new ScreenTimeDto(request.Date, total);
    }
}
