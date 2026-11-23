using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Queries.GetVoucher;

public sealed class GetVoucherQueryHandler(IVoucherRepository voucherRepository)
    : IRequestHandler<GetVoucherQuery, VoucherDto>
{
    public async Task<VoucherDto> Handle(GetVoucherQuery request, CancellationToken cancellationToken)
    {
        var voucher = await voucherRepository.FindVoucherByCodeAsync(request.Code, cancellationToken)
            ?? throw new VoucherNotFoundException(request.Code);

        if (voucher.PartnerId != request.CallerPartnerId)
            throw new VoucherAccessDeniedException();

        return VoucherDto.FromDomain(voucher);
    }
}
