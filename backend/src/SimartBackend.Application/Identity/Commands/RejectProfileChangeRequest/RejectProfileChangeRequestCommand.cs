using MediatR;

namespace SimartBackend.Application.Identity.Commands.RejectProfileChangeRequest;

public sealed record RejectProfileChangeRequestCommand(Guid CallerFamilyId, Guid RequestId) : IRequest;
