using MediatR;

namespace SimartBackend.Application.Identity.Commands.ApproveProfileChangeRequest;

public sealed record ApproveProfileChangeRequestCommand(Guid CallerFamilyId, Guid RequestId) : IRequest;
