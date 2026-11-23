namespace SimartBackend.Application.Admin.Dtos;

/// <summary>Returned by admin login — Token is the bearer token to send as
/// `Authorization: Bearer {Token}` on admin-only endpoints (content sync, the habit
/// catalog writes, the family directory).</summary>
public sealed record AdminAccountDto(Guid AdminId, string FullName, string Email, string Token);
