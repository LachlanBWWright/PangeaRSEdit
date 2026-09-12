# Backend

## Local development

The API targets .NET 9 and listens on port `8080` in its container. Local development uses SQLite and creates the development schema automatically.

```sh
dotnet run --project backend/PangeaRSEdit.Api
```

`/livez` reports that the process is running. `/healthz` is the readiness endpoint and verifies database connectivity.

## Production architecture

Production is intentionally constrained to exactly one Railway replica because SignalR groups and active WebRTC signaling state are held in process memory. Clients retry and rejoin signaling after a restart, while lobby membership and visibility remain in PostgreSQL.

The production topology is:

- GitHub Pages for the frontend.
- Railway for the backend container.
- Supabase PostgreSQL for durable data and migrations.
- An external TURN service with short-lived credentials issued by the API.
- Secret Manager for the database connection string and TURN shared secret.

Production startup fails closed unless PostgreSQL, CORS, TURN, `Multiplayer__Topology=single-instance`, and a deployment-specific `Multiplayer__RequiredContentHash` are configured. The topology declaration prevents accidentally deploying process-local signaling state across multiple replicas. The content hash must match `VITE_MULTIPLAYER_CONTENT_HASH` in the frontend build, preventing stale clients from joining a newer runtime. The application never creates or upgrades a production schema during normal startup.

## Railway and Supabase deployment

The repository includes [`backend/railway.json`](railway.json), which configures the
backend Docker deployment and `/healthz` readiness check. The [`supabase/`](../supabase/)
directory is the production migration authority. Supabase supplies PostgreSQL;
Railway must not provision a second database.

Create a Supabase project, connect the repository from Project Settings >
Integrations > GitHub Integration, and set the working directory to `.`. Enable
production deployment after reviewing the migration. Then create a Railway service
from the `backend` directory and configure one replica. Enter these Railway variables:

| Variable | Value |
| --- | --- |
| `ConnectionStrings__Default` | Supabase connection string, including SSL mode such as `Ssl Mode=Require` |
| `Frontend__BaseUrl` | Public frontend URL |
| `Cors__AllowedOrigins__0` | Exact frontend origin, without a trailing slash |
| `Multiplayer__StunUrl` | STUN service URL |
| `Multiplayer__TurnUrl` | TURN service URL |
| `Multiplayer__TurnSharedSecret` | TURN shared secret |
| `Multiplayer__ParticipantSigningKey` | High-entropy participant signing key |
| `Multiplayer__RequiredContentHash` | Same commit SHA compiled into the frontend |

For the GitHub Pages frontend, set `RAILWAY_API_ORIGIN` to the Railway service URL.
Set `MULTIPLAYER_ENABLED` to `true` when the backend is configured. The Pages
workflow compiles the current commit SHA, and the Railway workflow updates
`Multiplayer__RequiredContentHash` to the same SHA before deploying the backend.

The initial Supabase migration mirrors the existing EF Core migration history. For
future production schema changes, update the EF model and migration, generate the
SQL migration script, and commit the resulting SQL under `supabase/migrations/`.
Supabase's GitHub integration applies it before Railway uses the new model. Do not
run `--migrate` in Railway production; that mode remains available for local and
test environments only.

If you are not using the GitHub integration yet, apply pending migrations manually
with the Supabase CLI before deploying Railway:

```sh
supabase link --project-ref <project-ref>
supabase db push
```

Railway is intentionally limited to one instance because multiplayer signaling state
is process-local. Configure the Railway service with one replica and do not enable
multi-region deployment until signaling state is moved out of process memory.

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

The container supports a dedicated migration invocation for local and test use:

```sh
dotnet PangeaRSEdit.Api.dll --migrate
```

CI updates and executes a Cloud Run migration job before deploying the new service revision. A failed migration stops deployment.

## GitHub Actions configuration

The [`railway-backend.yml`](../.github/workflows/railway-backend.yml) workflow tests
and deploys the backend on pushes to `main`. Configure these repository/environment
values:

| Variable | Purpose |
| --- | --- |
| `RAILWAY_PROJECT_ID` | Railway project ID |
| `RAILWAY_SERVICE` | Railway backend service name; defaults to `pangearsedit-api` |
| `RAILWAY_ENVIRONMENT` | Railway environment; defaults to `production` |
| `RAILWAY_API_HOST` | Railway public API host, without `https://` |
| `RAILWAY_API_ORIGIN` | Full Railway API origin used by the Pages build |
| `MULTIPLAYER_ENABLED` | Set to `true` after the backend is configured |

Add `RAILWAY_TOKEN` as a secret with deployment access. The workflow updates
`Multiplayer__RequiredContentHash` to the current commit before deploying. The Pages
workflow uses the same commit as `VITE_MULTIPLAYER_CONTENT_HASH`, so a release cannot
silently mix frontend and backend runtime bundles.

## Rollback

Railway can roll back the service deployment, but database migrations may not be
backward compatible. Prefer additive migrations and expand/contract changes. Do not
remove EF migrations against production data.
