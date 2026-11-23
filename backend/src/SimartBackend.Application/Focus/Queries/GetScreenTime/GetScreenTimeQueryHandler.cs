using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Focus.Dtos;

namespace SimartBackend.Application.Focus.Queries.GetScreenTime;

public sealed class GetScreenTimeQueryHandler(
    IFamilyAccountRepository familyAccountRepository, IFocusRepository focusRepository)
    : IRequestHandler<GetScreenTimeQuery, ScreenTimeDto>
{
    public async Task<ScreenTimeDto> Handle(GetScreenTimeQuery request, CancellationToken cancellationToken)
    {
        await FocusChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var total = await focusRepository.GetScreenTimeAsync(request.ChildId, request.Date, cancellationToken);
        return new ScreenTimeDto(request.Date, total);
    }
}
