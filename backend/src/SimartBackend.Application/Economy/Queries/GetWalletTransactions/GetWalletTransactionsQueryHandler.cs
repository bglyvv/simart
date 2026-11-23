using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Queries.GetWalletTransactions;

public sealed class GetWalletTransactionsQueryHandler(
    IFamilyAccountRepository familyAccountRepository, IWalletRepository walletRepository)
    : IRequestHandler<GetWalletTransactionsQuery, IReadOnlyList<WalletTransactionDto>>
{
    public async Task<IReadOnlyList<WalletTransactionDto>> Handle(GetWalletTransactionsQuery request, CancellationToken cancellationToken)
    {
        await WalletChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var transactions = await walletRepository.GetRecentTransactionsForChildAsync(
            request.ChildId, request.Limit, cancellationToken);
        return transactions.Select(WalletTransactionDto.FromDomain).ToList();
    }
}
