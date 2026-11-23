using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Queries.GetWalletBalance;

public sealed class GetWalletBalanceQueryHandler(
    IFamilyAccountRepository familyAccountRepository, IWalletRepository walletRepository)
    : IRequestHandler<GetWalletBalanceQuery, WalletBalanceDto>
{
    public async Task<WalletBalanceDto> Handle(GetWalletBalanceQuery request, CancellationToken cancellationToken)
    {
        await WalletChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var balance = await walletRepository.GetBalanceAsync(request.ChildId, cancellationToken);
        return new WalletBalanceDto(balance);
    }
}
