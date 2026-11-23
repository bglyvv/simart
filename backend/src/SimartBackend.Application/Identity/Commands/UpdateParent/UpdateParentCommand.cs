using MediatR;

namespace SimartBackend.Application.Identity.Commands.UpdateParent;

/// <summary>Admin-only edit — FullName only. Never email or password here; both
/// are security-sensitive (email is the login identifier, password needs its own
/// verified-change flow) and deliberately out of scope for this admin action.</summary>
public sealed record UpdateParentCommand(Guid ParentId, string FullName) : IRequest;
