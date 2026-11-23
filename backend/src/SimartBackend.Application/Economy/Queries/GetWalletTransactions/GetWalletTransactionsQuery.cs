using MediatR;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Queries.GetWalletTransactions;

public sealed record GetWalletTransactionsQuery(Guid CallerFamilyId, Guid ChildId, int Limit)
    : IRequest<IReadOnlyList<WalletTransactionDto>>;
