namespace SimartBackend.Api.Contracts;

public sealed record DonateRequest(Guid CampaignId);

public sealed record GrantAllowanceRequest(decimal AmountAzn);
