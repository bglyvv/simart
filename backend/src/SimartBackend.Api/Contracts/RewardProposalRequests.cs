namespace SimartBackend.Api.Contracts;

public sealed record SubmitRewardProposalRequest(string Title, string? Description, int CostXp, string Icon);

public sealed record EditRewardProposalRequest(string Title, string? Description, int CostXp, string Icon);

public sealed record DeclineRewardProposalRequest(string? Note);

public sealed record RejectRewardProposalRequest(string? Note);
