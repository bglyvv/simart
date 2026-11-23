using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Infrastructure.Identity;

/// <summary>Real calls against the Resend HTTP API (resend.com/docs/api-reference) —
/// a single `POST /emails`, no SDK needed. Builds the actual reset link here (not
/// in Application — see IPasswordResetEmailSender's doc comment) by reading
/// Frontend:BaseUrl, since this is the one place that needs to know what the
/// frontend's real deployed URL is.</summary>
public sealed class ResendPasswordResetEmailSender(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    : IPasswordResetEmailSender
{
    public const string HttpClientName = "Resend";

    public async Task SendResetEmailAsync(string toEmail, string fullName, string rawToken, CancellationToken cancellationToken)
    {
        var apiKey = configuration["Resend:ApiKey"]
            ?? throw new InvalidOperationException(
                "Missing Resend:ApiKey — set it via `dotnet user-secrets` for local dev (see " +
                "backend/README.md) or the RESEND__APIKEY env var in other environments. Get one " +
                "free at https://resend.com.");
        var fromAddress = configuration["Resend:FromAddress"]
            ?? throw new InvalidOperationException(
                "Missing Resend:FromAddress — the verified sender identity Resend emails go out as " +
                "(e.g. 'SİMART <no-reply@yourdomain.com>'); set via the same mechanism as Resend:ApiKey. " +
                "Resend's sandbox mode lets you send from onboarding@resend.dev to your own account " +
                "email with no domain verification, for local testing.");
        var frontendBaseUrl = (configuration["Frontend:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');

        var resetLink = $"{frontendBaseUrl}/#/sifre-sifirla?token={Uri.EscapeDataString(rawToken)}";
        var html = $"""
            <p>Salam {fullName},</p>
            <p>SİMART hesabınız üçün şifrə sıfırlama tələbi aldıq. Aşağıdakı linkə klikləyərək yeni
            şifrə təyin edə bilərsiniz — link 1 saat etibarlıdır:</p>
            <p><a href="{resetLink}">{resetLink}</a></p>
            <p>Bu tələbi siz etməmisinizsə, bu e-poçtu nəzərə almayın — şifrəniz dəyişməyəcək.</p>
            """;

        var client = httpClientFactory.CreateClient(HttpClientName);
        using var request = new HttpRequestMessage(HttpMethod.Post, "emails")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", apiKey) },
            Content = JsonContent.Create(new
            {
                from = fromAddress,
                to = new[] { toEmail },
                subject = "SİMART — Şifrənizi sıfırlayın",
                html,
            }),
        };

        var response = await client.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
