# Backend

## Local development

The API targets .NET 9 and listens on port `8080` in its container. Local development uses SQLite and creates the development schema automatically.

```sh
dotnet run --project backend/PangeaRSEdit.Api
```

`/livez` reports that the process is running. `/healthz` is the readiness endpoint and verifies database connectivity.

## Production architecture

Production is intentionally constrained to at most one Cloud Run instance because SignalR groups and active WebRTC signaling state are held in process memory. The service can scale to zero when no requests or WebSocket connections are active. Clients retry and rejoin signaling after a cold start, while lobby membership and visibility remain in PostgreSQL.

The production topology is:

- GitHub Pages for the frontend.
- Artifact Registry for immutable backend images.
- Cloud Run with `min-instances=0` and `max-instances=1`.
- Cloud SQL for PostgreSQL.
- An external TURN service with short-lived credentials issued by the API.
- Secret Manager for the database connection string and TURN shared secret.

Production startup fails closed unless PostgreSQL, CORS, TURN, `Multiplayer__Topology=single-instance`, and a deployment-specific `Multiplayer__RequiredContentHash` are configured. The topology declaration prevents accidentally deploying process-local signaling state across multiple replicas. The content hash must match `VITE_MULTIPLAYER_CONTENT_HASH` in the frontend build, preventing stale clients from joining a newer runtime. The application never creates or upgrades a production schema during normal startup.

## Database migrations

EF Core migrations are stored in `PangeaRSEdit.Infrastructure/Persistence/Migrations`. Restore the pinned local tool and add migrations from the `backend` directory:

```sh
dotnet tool restore
dotnet tool run dotnet-ef migrations add MigrationName \
  --project PangeaRSEdit.Infrastructure/PangeaRSEdit.Infrastructure.csproj \
  --startup-project PangeaRSEdit.Api/PangeaRSEdit.Api.csproj \
  --context PangeaRSEditDbContext \
  --output-dir Persistence/Migrations
```

The container supports a dedicated migration invocation:

```sh
dotnet PangeaRSEdit.Api.dll --migrate
```

CI updates and executes a Cloud Run migration job before deploying the new service revision. A failed migration stops deployment.

## GitHub Actions configuration

Configure the following repository variables:

| Variable | Purpose |
| --- | --- |
| `GCP_PROJECT_ID` | Google Cloud project ID |
| `GCP_ARTIFACT_REGISTRY_LOCATION` | Artifact Registry region |
| `GCP_ARTIFACT_REGISTRY_REPOSITORY` | Docker repository name |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | GitHub Workload Identity provider |
| `GCP_ARTIFACT_REGISTRY_SERVICE_ACCOUNT` | Image publishing identity |
| `GCP_CLOUD_RUN_DEPLOY_SERVICE_ACCOUNT` | Migration and deployment identity |
| `GCP_CLOUD_RUN_RUNTIME_SERVICE_ACCOUNT` | Runtime identity used by the service and migration job |
| `GCP_CLOUD_RUN_REGION` | Cloud Run region |
| `GCP_CLOUD_RUN_SERVICE` | API service name |
| `GCP_CLOUD_RUN_MIGRATION_JOB` | Schema migration job name |
| `GCP_CLOUD_SQL_INSTANCE` | Cloud SQL instance connection name |
| `GCP_DATABASE_CONNECTION_STRING_SECRET` | Secret Manager secret name containing the Npgsql connection string |
| `GCP_TURN_SHARED_SECRET` | Secret Manager secret name containing the TURN shared secret |
| `GCP_PARTICIPANT_SIGNING_KEY_SECRET` | Secret Manager secret name containing a high-entropy participant signing key |
| `PRODUCTION_FRONTEND_URL` | Full frontend URL used for redirects |
| `PRODUCTION_FRONTEND_ORIGIN` | Exact frontend origin allowed by CORS |
| `PRODUCTION_API_ORIGIN` | Stable Cloud Run or custom-domain API origin compiled into the frontend |
| `MULTIPLAYER_STUN_URL` | Production STUN URL |
| `MULTIPLAYER_TURN_URL` | Production TURN URL |

Use a connection string whose host is the Cloud SQL Unix socket, for example `Host=/cloudsql/PROJECT:REGION:INSTANCE;Database=pangearsedit;Username=...;Password=...;Pooling=true;Maximum Pool Size=20`.

The Artifact Registry identity only needs repository write access. The deployment identity needs permission to update Cloud Run services and jobs and to act as the runtime identity. The runtime identity needs Cloud SQL Client and Secret Manager Secret Accessor for the configured runtime secrets.

Grant `roles/run.invoker` to `allUsers` on the API service once during infrastructure provisioning. The deployment workflow deliberately does not mutate public invocation IAM on each release.

The GitHub `production` environment should require approval. No long-lived Google Cloud credential is stored in GitHub; both workflows use GitHub OIDC and Workload Identity Federation.

## Rollback

Cloud Run keeps prior revisions, but a database migration may not be backward compatible. Prefer additive migrations and expand/contract changes. To roll back application code, direct all traffic to the previous healthy revision in Cloud Run. Do not run EF migration removal against production data.
