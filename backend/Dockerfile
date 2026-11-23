# Multi-stage build for the SimartBackend ASP.NET Core 9 API.
# Built from the backend/ directory as context (see .dockerignore alongside this file).

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY src/SimartBackend.Domain/SimartBackend.Domain.csproj src/SimartBackend.Domain/
COPY src/SimartBackend.Application/SimartBackend.Application.csproj src/SimartBackend.Application/
COPY src/SimartBackend.Infrastructure/SimartBackend.Infrastructure.csproj src/SimartBackend.Infrastructure/
COPY src/SimartBackend.Api/SimartBackend.Api.csproj src/SimartBackend.Api/
RUN dotnet restore src/SimartBackend.Api/SimartBackend.Api.csproj

COPY src/ src/
RUN dotnet publish src/SimartBackend.Api/SimartBackend.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_ENVIRONMENT=Production
# Render (and most PaaS hosts) inject $PORT at runtime; .NET must bind to it.
# Shell-form CMD is required so $PORT is expanded at container start, not build time.
EXPOSE 8080
CMD ASPNETCORE_URLS=http://+:${PORT:-8080} dotnet SimartBackend.Api.dll
