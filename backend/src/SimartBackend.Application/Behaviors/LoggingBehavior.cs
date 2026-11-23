using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;

namespace SimartBackend.Application.Behaviors;

/// <summary>Logs every request that goes through MediatR and how long it took —
/// cross-cutting, so individual handlers stay free of it.</summary>
public sealed class LoggingBehavior<TRequest, TResponse>(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        var stopwatch = Stopwatch.StartNew();

        logger.LogInformation("Handling {Request}", requestName);
        var response = await next(cancellationToken);
        logger.LogInformation("Handled {Request} in {ElapsedMs}ms", requestName, stopwatch.ElapsedMilliseconds);

        return response;
    }
}
