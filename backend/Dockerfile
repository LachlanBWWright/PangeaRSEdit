# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS restore
WORKDIR /src

COPY PangeaRSEdit.sln ./
COPY PangeaRSEdit.Api/PangeaRSEdit.Api.csproj PangeaRSEdit.Api/
COPY PangeaRSEdit.Application/PangeaRSEdit.Application.csproj PangeaRSEdit.Application/
COPY PangeaRSEdit.Domain/PangeaRSEdit.Domain.csproj PangeaRSEdit.Domain/
COPY PangeaRSEdit.Infrastructure/PangeaRSEdit.Infrastructure.csproj PangeaRSEdit.Infrastructure/
COPY PangeaRSEdit.Tests/PangeaRSEdit.Tests.csproj PangeaRSEdit.Tests/
RUN dotnet restore PangeaRSEdit.Api/PangeaRSEdit.Api.csproj

FROM restore AS publish
COPY . .
RUN dotnet publish PangeaRSEdit.Api/PangeaRSEdit.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080 \
    PORT=8080

EXPOSE 8080

RUN chown app:app /app
COPY --from=publish --chown=app:app /app/publish .
USER app

# Render supplies PORT at runtime; keep local/container execution on 8080 when
# no platform port is present.
ENTRYPOINT ["sh", "-c", "ASPNETCORE_HTTP_PORTS=${PORT:-8080} exec dotnet PangeaRSEdit.Api.dll"]
