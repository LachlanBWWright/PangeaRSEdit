# Backend

## Local development

The API targets .NET 9 and listens on port `8080` in its container. Local development uses SQLite and creates the development schema automatically.

```sh
dotnet run --project backend/PangeaRSEdit.Api
```

`/livez` reports that the process is running. `/healthz` is the readiness endpoint and verifies database connectivity.

## Production architecture

Production is intentionally constrained to exactly one Render instance because SignalR groups and active WebRTC signaling state are held in process memory. Clients retry and rejoin signaling after a restart, while lobby membership and visibility remain in PostgreSQL.

The production topology is:

- GitHub Pages for the frontend.
- Render Web Service for the backend container.
- Supabase PostgreSQL for durable data and migrations.
- An external TURN service with short-lived credentials issued by the API.
- Render environment variables/secrets for deployment configuration.

Production startup requires PostgreSQL, CORS, and a participant-token signing key. Multiplayer uses one instance because signaling state is process-local. The application never creates or upgrades a production schema during normal startup.

## Render and Supabase deployment

The repository includes [`render.yaml`](../render.yaml), which defines the Render Web Service. It uses the Dockerfile at `backend/Dockerfile`, exposes `/healthz` as the HTTP health check, and sets the service to one instance. Render's `PORT` value is passed through to ASP.NET Core by the Docker entrypoint.

Create the Render service from the repository's Blueprint, or create a Docker Web Service manually with:

- Root directory: `backend`
- Runtime: `Docker`
- Dockerfile: `./Dockerfile`
- Health check path: `/healthz`
- Instance count: `1`

Render supplies the web-service `PORT`; the container also remains runnable locally on port `8080` when `PORT` is not set. Render web services must listen on `0.0.0.0`; ASP.NET Core does so through the container port configuration. [Render's web-service documentation](https://render.com/docs/web-services) describes the required port binding, and [Render's health-check documentation](https://render.com/docs/health-checks) documents the `/healthz` HTTP probe.

Set these Render variables and secrets:

| Variable | Value |
| --- | --- |
| `ConnectionStrings__Default` | Supabase connection string, including SSL mode such as `Ssl Mode=Require` |
| `Cors__AllowedOrigins__0` | Exact frontend origin, without a trailing slash |
| `Multiplayer__ParticipantSigningKey` | High-entropy participant signing key |

The GitHub Pages build uses the `RENDER_API_ORIGIN` repository/environment variable for the deployed API origin. Set `MULTIPLAYER_ENABLED` to `true` when the backend is configured.

`Multiplayer__StunUrl` is optional; if absent, the API uses Google's public STUN server. TURN variables are also optional and are only needed when direct peer connections fail behind restrictive NATs or firewalls. Google OAuth is optional; add `Authentication__Google__ClientId` and `Authentication__Google__ClientSecret` only if sign-in is enabled.

Supabase is the production migration authority. The initial Supabase migration mirrors the existing EF Core migration history. For future production schema changes, update the EF model and migration, generate the SQL migration script, and commit the resulting SQL under `supabase/migrations/`. Apply pending migrations with the Supabase CLI before deploying the API:

```sh
supabase link --project-ref <project-ref>
supabase db push
```

Do not run `--migrate` as the normal Render service start command. That mode remains available for local and test environments only, and the production API intentionally does not run schema changes during startup.

Render's free plan does not provide a pre-deploy command, so production migrations should be applied through Supabase before the Render deploy. On a paid Render plan, a pre-deploy command can be used for an explicitly designed migration workflow; it must still run against the same Supabase database and be reviewed for backward compatibility.

## Database migrations

EF Core migrations are stored in `PangeaRSEdit.Infrastructure/Persistence/Migrations`. Restore the pinned local tool and add migrations from the backend directory:

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

## Frontend and backend release order

1. Apply any pending Supabase migrations.
2. Deploy the backend from the target commit on Render.
3. Build/deploy the GitHub Pages frontend with `RENDER_API_ORIGIN`.

Keep the Render service at one instance until multiplayer signaling state is moved out of process memory.

## Rollback

Render can roll back the service deployment, but database migrations may not be backward compatible. Prefer additive migrations and expand/contract changes. Do not remove EF migrations against production data.
