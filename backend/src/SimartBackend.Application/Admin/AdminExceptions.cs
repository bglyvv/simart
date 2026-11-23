namespace SimartBackend.Application.Admin;

/// <summary>Thrown by LoginAdminCommandHandler on a wrong email/password — mapped to
/// 401 by the Api endpoint. Same "don't let a caller enumerate accounts" reasoning as
/// Identity's InvalidCredentialsException: one message for both "no such email" and
/// "wrong password".</summary>
public sealed class InvalidAdminCredentialsException() : Exception("Incorrect email or password.");
