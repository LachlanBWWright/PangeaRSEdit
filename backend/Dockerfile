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

FROM debian:bookworm-slim AS luals
ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && case "$TARGETARCH" in \
      amd64) LUALS_ARCH=x64; LUALS_SHA=e9235d2d72ef55bc41cf8c99cda2ed64777682024b4bb81f5dea425060c5cbb8 ;; \
      arm64) LUALS_ARCH=arm64; LUALS_SHA=abd2572e8fc929dc838a81ffb8473c5bce0bf39bfe8edb4b120b3b623176ce83 ;; \
      *) exit 1 ;; \
    esac \
    && curl --fail --location --silent --show-error \
      "https://github.com/LuaLS/lua-language-server/releases/download/3.19.1/lua-language-server-3.19.1-linux-${LUALS_ARCH}.tar.gz" \
      --output /tmp/luals.tar.gz \
    && echo "${LUALS_SHA}  /tmp/luals.tar.gz" | sha256sum --check --strict \
    && mkdir -p /opt/lua-language-server \
    && tar -xzf /tmp/luals.tar.gz -C /opt/lua-language-server \
    && /opt/lua-language-server/bin/lua-language-server --version

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080 \
    PORT=8080

EXPOSE 8080

RUN chown app:app /app
COPY --from=publish --chown=app:app /app/publish .
COPY --from=luals /opt/lua-language-server /opt/lua-language-server
USER app

# Render supplies PORT at runtime; keep local/container execution on 8080 when
# no platform port is present.
ENTRYPOINT ["sh", "-c", "ASPNETCORE_HTTP_PORTS=${PORT:-8080} exec dotnet PangeaRSEdit.Api.dll"]
