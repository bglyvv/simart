using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Identity.Dtos;
using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Application.Identity.Commands.SignUpFamily;

public sealed class SignUpFamilyCommandHandler(
    IFamilyAccountRepository repository,
    IPasswordHasher passwordHasher,
    IAuthTokenService authTokenService)
    : IRequestHandler<SignUpFamilyCommand, FamilyAccountDto>
{
    public async Task<FamilyAccountDto> Handle(SignUpFamilyCommand request, CancellationToken cancellationToken)
    {
        // Normalized once here so storage and the uniqueness check always agree —
        // Postgres text comparison is case-sensitive by default, no citext/ILIKE in play.
        var email = request.Email.Trim().ToLowerInvariant();

        if (await repository.EmailExistsAsync(email, cancellationToken))
            throw new EmailAlreadyUsedException(email);

        var family = new Family
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTimeOffset.UtcNow,
        };
        var parent = new Parent
        {
            Id = Guid.NewGuid(),
            FamilyId = family.Id,
            FullName = request.FullName,
            Email = email,
            PasswordHash = passwordHasher.Hash(request.Password),
            PinHash = passwordHasher.Hash(request.Pin),
        };
        family.Parents.Add(parent);

        await repository.AddFamilyAsync(family, cancellationToken);

        // Auto-login: signup returns an immediately-usable token so the frontend's
        // signup -> add-child flow doesn't need a separate login step.
        var token = authTokenService.IssueFamilyToken(family.Id, parent.Id, parent.Email);
        return new FamilyAccountDto(family.Id, parent.Id, parent.FullName, parent.Email, token);
    }
}
