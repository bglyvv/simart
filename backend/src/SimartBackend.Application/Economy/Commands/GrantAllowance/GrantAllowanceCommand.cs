using MediatR;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Commands.GrantAllowance;

public sealed record GrantAllowanceCommand(Guid CallerFamilyId, Guid ChildId, decimal AmountAzn) : IRequest<WalletTransactionDto>;
