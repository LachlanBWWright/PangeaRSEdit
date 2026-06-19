# Backend

## Container image

Build the production image from the repository root:

```sh
docker build --file backend/Dockerfile --tag pangearsedit-api:local backend
docker run --rm --publish 8080:8080 \
  --env Database__Provider=postgres \
  --env ConnectionStrings__Default='Host=host.docker.internal;Database=pangearsedit;Username=postgres;Password=postgres' \
  pangearsedit-api:local
```

The API listens on port `8080`. Its health endpoint is `/healthz`.

SQLite is intended for local development. A container running with SQLite loses its
database when the container is replaced unless a persistent volume is mounted.
Production deployments should use PostgreSQL.

## Artifact Registry publishing

The `Backend Container` GitHub Actions workflow tests the backend, builds the
container, and publishes it to:

```text
LOCATION-docker.pkg.dev/PROJECT_ID/REPOSITORY/pangearsedit-api
```

Configure these GitHub repository variables:

| Variable | Example |
| --- | --- |
| `GCP_PROJECT_ID` | `pangearsedit-prod` |
| `GCP_ARTIFACT_REGISTRY_LOCATION` | `australia-southeast1` |
| `GCP_ARTIFACT_REGISTRY_REPOSITORY` | `pangearsedit` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/123456789/locations/global/workloadIdentityPools/github/providers/github` |
| `GCP_ARTIFACT_REGISTRY_SERVICE_ACCOUNT` | `github-artifact-writer@pangearsedit-prod.iam.gserviceaccount.com` |

In Google Cloud:

1. Create a Docker Artifact Registry repository in the configured location.
2. Create a service account for GitHub Actions.
3. Grant that service account `roles/artifactregistry.writer` on the repository.
4. Create a Workload Identity Pool provider for GitHub and restrict its attribute
   condition to this repository.
5. Grant the GitHub repository principal
   `roles/iam.workloadIdentityUser` on the service account.

No long-lived Google Cloud key is stored in GitHub. The workflow exchanges
GitHub's short-lived OIDC token for a short-lived Google access token.

Pushes to `main` publish `latest` and `sha-<commit>` tags. Tags matching
`backend-v*` also publish the Git tag. The workflow can also be run manually.

## Runtime configuration

Set these values on the target GCP runtime, preferably from Secret Manager for
credentials:

```text
ASPNETCORE_ENVIRONMENT=Production
Database__Provider=postgres
ConnectionStrings__Default=<postgres connection string>
Authentication__Google__ClientId=<Google OAuth client ID>
Authentication__Google__ClientSecret=<Google OAuth client secret>
Frontend__BaseUrl=<frontend URL>
Cors__AllowedOrigins__0=<frontend origin>
```

The current application calls `EnsureCreatedAsync` during startup. Replace that
with EF Core migrations before relying on automatic production schema upgrades.
