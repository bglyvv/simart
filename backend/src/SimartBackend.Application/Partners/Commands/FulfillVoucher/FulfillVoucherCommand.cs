using MediatR;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.FulfillVoucher;

public sealed record FulfillVoucherCommand(Guid CallerPartnerId, string Code) : IRequest<VoucherDto>;
