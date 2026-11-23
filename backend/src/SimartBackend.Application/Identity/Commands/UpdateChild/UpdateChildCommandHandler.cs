using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Identity.Commands.UpdateChild;

public sealed class UpdateChildCommandHandler(IFamilyAccountRepository repository)
    : IRequestHandler<UpdateChildCommand>
{
    public async Task Handle(UpdateChildCommand request, CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();
        var city = request.City.Trim();
        if (name.Length == 0 || city.Length == 0)
            throw new InvalidChildInfoException();

        var ok = await repository.UpdateChildInfoAsync(request.ChildId, name, city, cancellationToken);
        if (!ok)
            throw new ChildAccountNotFoundException(request.ChildId);
    }
}
