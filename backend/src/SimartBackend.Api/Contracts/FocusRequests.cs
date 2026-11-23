namespace SimartBackend.Api.Contracts;

public sealed record StartFocusLockRequest(int Minutes, string Reason);

public sealed record AddScreenTimeRequest(DateOnly Date, int SecondsDelta);
