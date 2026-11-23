using System.Text.Json;

namespace SimartBackend.Tests.Api;

/// <summary>Minimal APIs serialize/bind with camelCase by default — HttpClient's JSON
/// extensions don't unless told to, so every request/response in these tests passes
/// this explicitly rather than relying on default casing matching by coincidence.</summary>
internal static class JsonTestOptions
{
    public static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);
}
