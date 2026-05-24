# Backend Azure Deployment Plan

## Goal

Deploy the C# backend in `backend/` to Azure with production-grade configuration for:

- ASP.NET Core `net9.0` API hosting.
- PostgreSQL-backed persistence.
- Google OAuth and secure cookie sessions.
- SignalR/WebSocket support for multiplayer signaling.
- GitHub Actions based continuous deployment.
- Observability and rollback paths.

## Current Backend Shape

- API project: `backend/PangeaRSEdit.Api/PangeaRSEdit.Api.csproj`.
- Solution: `backend/PangeaRSEdit.sln`.
- Runtime: ASP.NET Core `net9.0`.
- Persistence: EF Core with provider selected by `Database:Provider`.
- Supported providers: SQLite by default, PostgreSQL when `Database:Provider=postgres`.
- Startup currently calls `EnsureCreatedAsync`, which is suitable for local/dev bootstrap but not production schema management.
- Auth uses secure HTTP-only cookies and optional Google OAuth.
- CORS is configured through `Cors:AllowedOrigins`.
- SignalR hub is exposed at `/api/multiplayer/signaling`.
- Health probe is available at `/healthz`.
- Existing GitHub Actions only runs backend CI; deployment currently only publishes the frontend to GitHub Pages.

## Recommended Azure Architecture

Use the simplest managed stack first:

- Azure App Service, Linux, for the ASP.NET Core API.
- Azure Database for PostgreSQL Flexible Server for persistent data.
- Application Insights for logs, request traces, dependency traces, and health monitoring.
- Azure Key Vault for Google OAuth secrets and database credentials if the deployment is managed through IaC.
- GitHub Actions using Azure federated identity / OIDC for deployment.

Defer Azure SignalR Service until the backend needs horizontal scale, multiple App Service instances, or more reliable realtime fanout under load. For a single App Service instance, enable WebSockets and keep ARR affinity/session affinity enabled. If the app scales to multiple instances, use Azure SignalR Service rather than relying on sticky sessions and in-process SignalR state.

## Environment Layout

Create at least two Azure environments:

- `staging`: validates deployment, database migrations, OAuth callback, frontend/backend CORS, and SignalR before promotion.
- `production`: serves real users and uses locked-down secrets, backups, and alerts.

Use separate App Services and PostgreSQL databases for staging and production. Sharing one PostgreSQL server with separate databases is acceptable initially if cost matters, but separate servers reduce blast radius.

## Azure Resources

### Resource Group

Create one resource group per environment or one shared group with environment suffixes:

- `rg-pangearsedit-staging`
- `rg-pangearsedit-prod`

### App Service Plan

Start with a Linux App Service Plan sized for low traffic:

- Staging: Basic or low-cost SKU.
- Production: Basic or Standard SKU.

Production needs a SKU that supports:

- Always On.
- Custom domain and TLS.
- WebSockets.
- Scale-up without changing deployment shape.

### App Service

Create one web app per environment:

- `app-pangearsedit-api-staging`
- `app-pangearsedit-api-prod`

Configure:

- Runtime stack: .NET 9.
- HTTPS only: enabled.
- Always On: enabled for production.
- WebSockets: enabled.
- Health check path: `/healthz`.
- Minimum TLS version: current Azure default or stricter.
- Session affinity: enabled while using in-app SignalR on a single or manually scaled App Service.

### PostgreSQL

Create Azure Database for PostgreSQL Flexible Server:

- `psql-pangearsedit-staging`
- `psql-pangearsedit-prod`

Configure:

- Private access if using VNet integration, otherwise restrict firewall rules to Azure services/App Service outbound addresses.
- Automatic backups enabled.
- Point-in-time restore retention appropriate for production.
- Separate database user for the app.
- Separate database name per environment, for example `pangearsedit`.

The backend already has an Npgsql path, so production should set:

- `Database__Provider=postgres`
- `ConnectionStrings__Default=<postgres connection string>`

### Application Insights

Enable Application Insights for each App Service.

Track:

- Failed requests.
- Dependency failures to PostgreSQL.
- Request latency.
- SignalR connection errors.
- Health probe failures.

Add explicit structured logging later if current logs do not explain auth, persistence, or multiplayer failures clearly enough.

### Key Vault

Use Key Vault for:

- `Authentication:Google:ClientId`
- `Authentication:Google:ClientSecret`
- PostgreSQL connection string, unless managed identity/database auth is adopted.

For a first deployment, App Service app settings can hold these values directly. Move to Key Vault references once the basic path is proven.

## Required Code Changes Before Production

### 1. Replace `EnsureCreatedAsync` with Migrations

Current startup creates the schema with `EnsureCreatedAsync`. Production should use EF Core migrations.

Tasks:

- Add an initial EF Core migration for the current schema.
- Replace startup `EnsureCreatedAsync` with a migration strategy.
- Prefer a deployment step that runs migrations once before app deployment or startup release.
- If startup migration is used, guard it carefully so failures fail fast and are visible.

Reason: `EnsureCreatedAsync` bypasses normal migration history and makes future schema evolution risky.

### 2. Add Production Configuration Documentation

Document required App Service settings:

- `ASPNETCORE_ENVIRONMENT=Production`
- `Database__Provider=postgres`
- `ConnectionStrings__Default=<secret>`
- `Authentication__Google__ClientId=<secret>`
- `Authentication__Google__ClientSecret=<secret>`
- `Frontend__BaseUrl=<frontend URL>`
- `Cors__AllowedOrigins__0=<frontend origin>`

If the frontend remains on GitHub Pages, the production origin will look like:

- `https://<owner>.github.io`
- or `https://<owner>.github.io/<repo>` depending on the published Pages URL.

If a custom domain is used, configure both frontend and backend under the same parent site where possible. Same-site cookies are simpler and safer when the frontend and backend share a registrable domain.

### 3. Confirm Cookie Settings for Cross-Origin Frontend

The API currently uses `SameSite=Lax`. This works best when the frontend and backend are same-site. If GitHub Pages and Azure App Service remain on unrelated domains, cookie behavior may not match authenticated API needs.

Preferred fix:

- Put frontend and backend on related custom domains, for example:
- `https://app.pangearsedit.example`
- `https://api.pangearsedit.example`

If unrelated domains are unavoidable:

- Revisit cookie `SameSite` policy.
- Add CSRF protection for mutating cookie-authenticated endpoints.
- Test OAuth sign-in and authenticated `fetch(..., credentials: "include")` in real browsers.

### 4. Add Frontend Production API Variables

The frontend already supports:

- `VITE_API_ORIGIN`
- `VITE_API_BASE_PATH`

For GitHub Pages plus Azure API, build frontend production with:

- `VITE_API_ORIGIN=https://<api-app>.azurewebsites.net`
- `VITE_API_BASE_PATH=`

If using a reverse proxy or same-origin hosting later, keep `VITE_API_ORIGIN` unset and set `VITE_API_BASE_PATH` to the API path prefix.

### 5. Decide SignalR Scale Strategy

Initial deployment:

- Single App Service instance.
- WebSockets enabled.
- ARR affinity/session affinity enabled.

Scale-out deployment:

- Add Azure SignalR Service.
- Add the Microsoft Azure SignalR package to the API.
- Configure the backend to call the Azure SignalR integration from `AddSignalR`.
- Remove reliance on process-local SignalR connection state.

The multiplayer lobby service also has runtime state, so multi-instance scale requires checking that all lobby and participant state needed across instances is persisted in PostgreSQL or moved to a shared backing service.

## GitHub Actions Deployment Plan

Add a backend deployment workflow separate from the existing frontend Pages workflow.

Recommended jobs:

1. `test`
   - `dotnet restore backend/PangeaRSEdit.sln`
   - `dotnet format backend/PangeaRSEdit.sln --verify-no-changes --verbosity minimal`
   - `dotnet build backend/PangeaRSEdit.sln --configuration Release --no-restore`
   - `dotnet test backend/PangeaRSEdit.sln --configuration Release --no-build`

2. `publish`
   - `dotnet publish backend/PangeaRSEdit.Api/PangeaRSEdit.Api.csproj --configuration Release --output ./publish`
   - Upload the publish directory as a workflow artifact.

3. `migrate-staging`
   - Run EF migrations against the staging database.
   - Use environment-protected secrets.

4. `deploy-staging`
   - Deploy the published artifact to the staging App Service with `Azure/webapps-deploy`.
   - Validate `/healthz`.

5. `smoke-staging`
   - Call `/healthz`.
   - Call unauthenticated public API endpoints that should work.
   - Confirm authenticated endpoints return expected `401` when no cookie is present.
   - Optionally run a small SignalR connection smoke test.

6. `deploy-production`
   - Require GitHub Environment approval.
   - Run migrations against production.
   - Deploy the same artifact to production.
   - Validate `/healthz`.

Use Azure OIDC/federated credentials rather than publish profiles where possible.

## Azure App Settings

Staging example:

```text
ASPNETCORE_ENVIRONMENT=Staging
Database__Provider=postgres
ConnectionStrings__Default=<staging-postgres-connection-string>
Authentication__Google__ClientId=<staging-google-client-id>
Authentication__Google__ClientSecret=<staging-google-client-secret>
Frontend__BaseUrl=https://<staging-frontend-origin>
Cors__AllowedOrigins__0=https://<staging-frontend-origin>
```

Production example:

```text
ASPNETCORE_ENVIRONMENT=Production
Database__Provider=postgres
ConnectionStrings__Default=<prod-postgres-connection-string>
Authentication__Google__ClientId=<prod-google-client-id>
Authentication__Google__ClientSecret=<prod-google-client-secret>
Frontend__BaseUrl=https://<prod-frontend-origin>
Cors__AllowedOrigins__0=https://<prod-frontend-origin>
```

## Google OAuth Configuration

Create separate OAuth clients for staging and production.

Authorized redirect URIs:

- `https://<staging-api-host>/api/auth/google/callback`
- `https://<prod-api-host>/api/auth/google/callback`

Authorized JavaScript origins:

- Staging frontend origin.
- Production frontend origin.
- API origins if Google requires them for the selected OAuth client setup.

## Networking and Security

Minimum first deployment:

- HTTPS only.
- CORS locked to known frontend origins.
- No wildcard production origins.
- Secrets stored in App Service settings or Key Vault.
- PostgreSQL firewall restricted.
- Database user has only required privileges.

Preferred production hardening:

- Custom domains for frontend and API.
- VNet integration between App Service and PostgreSQL.
- Private endpoint for PostgreSQL.
- Key Vault references from App Service.
- Azure managed identity for Azure resource access.
- Rate limiting on auth and multiplayer endpoints.
- CSRF protection if cookies are used cross-site.

## Database Migration Strategy

Short-term:

- Generate EF migration from current model.
- Run migrations through a GitHub Actions deployment job.
- Fail deployment if migrations fail.

Medium-term:

- Add migration bundles or a small migration runner.
- Keep schema migration logs in deployment output.
- Require manual approval before production migrations that include destructive operations.

Do not use SQLite in Azure App Service for user data. App Service filesystem behavior is not an appropriate production database boundary, and it will not support scale-out correctly.

## Smoke Test Checklist

After staging deployment:

- `GET /healthz` returns `200`.
- API rejects unknown origins.
- API allows the configured frontend origin.
- `GET /api/me` returns `401` before sign-in.
- Google sign-in redirects to Google and callback succeeds.
- Signed-in `GET /api/me` returns the profile.
- Saved-level create/list/read/update flow works against PostgreSQL.
- Multiplayer lobby create/join flow works.
- SignalR hub connects from the deployed frontend.
- WebRTC signaling messages are relayed between two browsers.

After production deployment:

- Repeat the staging smoke tests.
- Confirm Application Insights receives request telemetry.
- Confirm PostgreSQL has new rows after saved-level and lobby tests.
- Confirm backup policy and restore window are visible in Azure Portal.

## Rollback Plan

Application rollback:

- Keep the previous successful GitHub Actions artifact.
- Redeploy the previous artifact if the app deploy fails after migration.
- Use App Service deployment slots if zero-downtime swap and fast rollback become important.

Database rollback:

- Prefer forward-only corrective migrations.
- For destructive migrations, take a PostgreSQL backup or restore point first.
- Do not deploy destructive schema changes without a tested restore path.

## Cost-Control Path

Lowest reasonable first deployment:

- One low-tier Linux App Service Plan.
- One small PostgreSQL Flexible Server.
- Application Insights with default retention and sampling.
- No Azure SignalR Service until scale-out is required.

Scale when needed:

- Increase App Service Plan SKU.
- Add deployment slots.
- Add Azure SignalR Service.
- Add private networking.
- Split staging and production PostgreSQL servers if initially shared.

## Implementation Order

1. Add EF Core migrations and remove production reliance on `EnsureCreatedAsync`.
2. Create staging Azure resources.
3. Configure staging Google OAuth client.
4. Add backend GitHub Actions publish/deploy workflow using Azure OIDC.
5. Configure staging App Service settings.
6. Build frontend with staging `VITE_API_ORIGIN`.
7. Deploy backend to staging.
8. Run smoke tests.
9. Create production Azure resources.
10. Configure production Google OAuth client and app settings.
11. Add protected production deployment environment in GitHub.
12. Deploy production.
13. Add alerts for failed requests, health check failures, and PostgreSQL connection failures.

## References

- Azure App Service GitHub Actions deployment: https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions
- Azure Database for PostgreSQL Flexible Server quickstart: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/quickstart-create-server
- ASP.NET Core SignalR scaling guidance: https://learn.microsoft.com/en-us/aspnet/core/signalr/scale
- Publishing ASP.NET Core SignalR to Azure App Service: https://learn.microsoft.com/en-us/aspnet/core/signalr/publish-to-azure-web-app
- .NET on Azure App Service support note: https://azure.github.io/AppService/2024/11/12/dotnet9-ga.html
