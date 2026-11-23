using MediatR;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Commands.SignUpFamily;

/// <summary>Creates a new Family with its first Parent. Format validation (required
/// fields, password length, PIN shape) happens in the Api endpoint, same precedent as
/// the audience parsing on GET /api/content/playlists — this handler only owns the
/// one real business rule: email uniqueness.</summary>
public sealed record SignUpFamilyCommand(string FullName, string Email, string Password, string Pin)
    : IRequest<FamilyAccountDto>;
