using MediatR;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Queries.GetWalletBalance;

public sealed record GetWalletBalanceQuery(Guid CallerFamilyId, Guid ChildId) : IRequest<WalletBalanceDto>;
