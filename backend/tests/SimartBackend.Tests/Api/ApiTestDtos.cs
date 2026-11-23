namespace SimartBackend.Tests.Api;

// Mirror SimartBackend.Api.Contracts' request shapes and the Application DTOs' response
// shapes — kept separate (not referencing those types directly) so these tests fail if
// the real wire shape drifts, the same way a real frontend client would notice.

internal sealed record SignupRequestBody(string FullName, string Email, string Password, string Pin);

internal sealed record LoginRequestBody(string Email, string Password);

internal sealed record AddChildRequestBody(string Name, string AvatarEmoji, string Gender, DateOnly DateOfBirth, string City);

internal sealed record FamilyAccountResponse(Guid FamilyId, Guid ParentId, string FullName, string Email, string Token);

internal sealed record ChildResponse(Guid ChildId, Guid FamilyId, string Name, string AvatarEmoji, string Gender, DateOnly DateOfBirth, string City);

internal sealed record ErrorResponse(string Error);
