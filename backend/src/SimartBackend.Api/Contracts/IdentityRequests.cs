namespace SimartBackend.Api.Contracts;

public sealed record SignUpRequest(string FullName, string Email, string Password, string Pin);

public sealed record LoginRequest(string Email, string Password);

public sealed record AddChildRequest(string Name, string AvatarEmoji, string Gender, DateOnly DateOfBirth, string City);

public sealed record ForgotPasswordRequest(string Email);

public sealed record ResetPasswordRequest(string Token, string NewPassword);

public sealed record UpdateParentRequest(string FullName);

public sealed record UpdateChildRequest(string Name, string City);

public sealed record VerifyPinRequest(string Pin);

public sealed record ChangePinRequest(string CurrentPin, string NewPin);
