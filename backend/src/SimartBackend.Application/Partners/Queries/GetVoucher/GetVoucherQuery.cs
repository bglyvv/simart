using MediatR;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Queries.GetVoucher;

public sealed record GetVoucherQuery(Guid CallerPartnerId, string Code) : IRequest<VoucherDto>;
