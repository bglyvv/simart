using MediatR;

namespace SimartBackend.Application.Identity.Commands.ForgotPassword;

/// <summary>Never throws for "no such email" — see the handler's doc comment for
/// why, same anti-enumeration shape LoginFamilyCommand already uses.</summary>
public sealed record ForgotPasswordCommand(string Email) : IRequest;
