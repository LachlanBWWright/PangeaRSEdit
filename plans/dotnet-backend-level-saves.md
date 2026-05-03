# .NET Backend Level Saves Plan

## Goal

Add a .NET backend that lets users sign in with Google OAuth2, save edited level data to their account, and restore saved level data later. Each saved level must record the game it belongs to, the level identity it corresponds to, enough file metadata to avoid restoring data into the wrong context, and versioned payload metadata for future format changes.

## Current System Shape

- The frontend is a Vite/React app in `frontend/`.
- Level loading currently starts from local files in the browser, with upload flows around `frontend/src/editor/UploadPrompt.tsx` and `frontend/src/editor/gameCards/GameCard.tsx`.
- Parsed editor data is held client-side through existing editor state and data utilities.
- The project already uses `neverthrow` and Zod on the frontend, so API clients should validate server responses before treating them as typed data.
- There is no existing .NET solution or backend project in the repository.

## Backend Scope

Build a first backend that supports:

- Google OAuth2 sign in.
- First-party session management for the frontend.
- User profile lookup for the signed-in user.
- Creating saved level records.
- Listing saved levels for the signed-in user.
- Loading one saved level by id.
- Updating an existing saved level.
- Soft deleting saved levels.
- Recording the game, level id, level display name, source file metadata, and saved payload metadata.

Defer these until after the first version:

- Sharing saved levels between users.
- Public galleries or discovery.
- Collaborative editing.
- Fine-grained object history.
- Cross-device conflict resolution beyond simple optimistic concurrency.
- Admin UI.

## Proposed Project Layout

Add a backend folder at the project root:

```text
backend/
  PangeaRSEdit.Api/
  PangeaRSEdit.Application/
  PangeaRSEdit.Domain/
  PangeaRSEdit.Infrastructure/
  PangeaRSEdit.Tests/
  PangeaRSEdit.sln
```

Responsibilities:

- `PangeaRSEdit.Api`: ASP.NET Core entry point, auth setup, controllers or minimal endpoints, request/response DTOs.
- `PangeaRSEdit.Application`: use cases for auth profile lookup and saved level CRUD.
- `PangeaRSEdit.Domain`: user and saved level entities, value objects, domain validation.
- `PangeaRSEdit.Infrastructure`: Entity Framework Core, database migrations, blob storage implementation, Google auth integration boundaries.
- `PangeaRSEdit.Tests`: unit tests for domain/application logic and integration tests for API behavior.

Use nullable reference types, typed options, and explicit DTOs. Do not use dynamic object handling for payload metadata; parse unknown JSON through explicit models at the boundary.

## Authentication

Use Google OAuth2 as the external identity provider and keep the backend responsible for session ownership.

Recommended flow:

1. Frontend sends the user to `GET /api/auth/google/sign-in?returnUrl=...`.
2. Backend starts the Google OAuth challenge.
3. Google redirects to the backend callback.
4. Backend validates the Google identity and creates or updates the local user record.
5. Backend issues an HTTP-only, secure, same-site cookie session.
6. Backend redirects back to the frontend.
7. Frontend calls `GET /api/me` to retrieve the signed-in user.

Auth endpoints:

- `GET /api/auth/google/sign-in`
- `GET /api/auth/google/callback`
- `POST /api/auth/sign-out`
- `GET /api/me`

Session requirements:

- Use HTTP-only cookies.
- Set `Secure` outside local development.
- Use `SameSite=Lax` if the frontend and backend share a site in production.
- Add CSRF protection for mutating endpoints if cookie auth is used cross-origin.
- Store Google subject id as the stable external identity.
- Do not expose Google access tokens to the frontend.

Configuration:

- `Authentication:Google:ClientId`
- `Authentication:Google:ClientSecret`
- `Frontend:BaseUrl`
- `Cors:AllowedOrigins`

## Persistence

Use PostgreSQL for relational metadata and either database-backed JSON storage or object storage for larger level payloads.

First version recommendation:

- Store metadata in PostgreSQL.
- Store saved level payloads in PostgreSQL as compressed bytes if payloads are reasonably small.
- Keep the storage abstraction in place so large payloads can move to S3-compatible object storage later without changing API contracts.

Infrastructure interfaces:

```csharp
public interface SavedLevelPayloadStore
{
    Task<Result<SavedLevelPayloadRef, SavePayloadError>> SaveAsync(
        SavedLevelPayloadWrite request,
        CancellationToken cancellationToken);

    Task<Result<SavedLevelPayloadRead, LoadPayloadError>> LoadAsync(
        SavedLevelPayloadRef payloadRef,
        CancellationToken cancellationToken);
}
```

Avoid throwing from application-facing storage APIs. Wrap EF Core, compression, and JSON operations at the infrastructure boundary and return typed results.

## Data Model

Core tables:

- `users`
- `external_logins`
- `saved_levels`
- `saved_level_payloads`

`users`:

- `id`
- `display_name`
- `email`
- `avatar_url`
- `created_at`
- `updated_at`

`external_logins`:

- `id`
- `user_id`
- `provider`
- `provider_subject`
- `created_at`
- Unique index on `provider` and `provider_subject`.

`saved_levels`:

- `id`
- `user_id`
- `game`
- `level_key`
- `level_name`
- `source_file_name`
- `source_file_size`
- `source_file_sha256`
- `payload_ref`
- `payload_format_version`
- `payload_size_bytes`
- `payload_sha256`
- `description`
- `created_at`
- `updated_at`
- `deleted_at`
- `row_version`

`saved_level_payloads` for database-backed first version:

- `id`
- `saved_level_id`
- `compression`
- `content_type`
- `bytes`
- `created_at`

Important metadata:

- `game`: stable app-level game id, not a display label.
- `level_key`: stable level identifier when known, such as a canonical level filename or internal level id.
- `level_name`: user-facing name for lists.
- `source_file_sha256`: hash of the original uploaded level file when available.
- `payload_sha256`: hash of the stored edited payload.
- `payload_format_version`: app-owned version for saved editor payload shape.
- `row_version`: optimistic concurrency token for updates.

## Saved Payload Shape

Use a versioned envelope so future frontend changes can migrate saved data.

```json
{
  "version": 1,
  "game": "otto-matic",
  "levelKey": "level1_farm.bg3d",
  "editorData": {},
  "assets": []
}
```

The frontend should produce this envelope from the current editor state. The backend should validate envelope metadata against request metadata, but it should not need to understand every game-specific editor field in version 1.

Backend validation should enforce:

- `version` is supported.
- `game` matches the saved level metadata.
- `levelKey` matches the saved level metadata.
- Payload size is below the configured limit.
- Payload hash matches the bytes received after canonical serialization or upload hashing.

## API Contract

Saved level endpoints:

- `GET /api/saved-levels`
- `POST /api/saved-levels`
- `GET /api/saved-levels/{id}`
- `PUT /api/saved-levels/{id}`
- `DELETE /api/saved-levels/{id}`

List response:

```json
{
  "items": [
    {
      "id": "018f4c7d-7b3d-7000-a4f4-3f9f1d5e7f8b",
      "game": "otto-matic",
      "levelKey": "level1_farm.bg3d",
      "levelName": "Farm",
      "sourceFileName": "level1_farm.bg3d",
      "updatedAt": "2026-04-27T00:00:00Z",
      "rowVersion": "AAAAAAAAB9E="
    }
  ]
}
```

Create request:

```json
{
  "game": "otto-matic",
  "levelKey": "level1_farm.bg3d",
  "levelName": "Farm",
  "sourceFileName": "level1_farm.bg3d",
  "sourceFileSize": 123456,
  "sourceFileSha256": "hex",
  "payloadFormatVersion": 1,
  "payload": {
    "version": 1,
    "game": "otto-matic",
    "levelKey": "level1_farm.bg3d",
    "editorData": {},
    "assets": []
  }
}
```

Update request:

```json
{
  "rowVersion": "AAAAAAAAB9E=",
  "levelName": "Farm - edited",
  "payloadFormatVersion": 1,
  "payload": {
    "version": 1,
    "game": "otto-matic",
    "levelKey": "level1_farm.bg3d",
    "editorData": {},
    "assets": []
  }
}
```

Error responses should use a consistent problem details shape with stable error codes, such as:

- `auth.required`
- `savedLevel.notFound`
- `savedLevel.conflict`
- `payload.tooLarge`
- `payload.unsupportedVersion`
- `payload.metadataMismatch`

## Frontend Integration

Add a small API client layer under `frontend/src/api/`:

- `authApi.ts`
- `savedLevelsApi.ts`
- `apiSchemas.ts`
- `apiResult.ts`

Frontend rules:

- Validate every unknown API response with Zod.
- Return `Result` or `ResultAsync` from API client functions.
- Keep auth state separate from editor state.
- Do not persist server data directly into editor atoms without parsing.
- Surface save/load failures through existing toast patterns.

UI additions:

- Sign in button in the app shell or upload prompt.
- User menu with sign out.
- Save level action in the editor once a level is loaded.
- Restore saved level browser from the upload prompt or editor.
- Dirty state indicator after a saved level has local edits.
- Conflict handling when `rowVersion` does not match the server.

Restore behavior:

- User selects a saved level.
- Frontend fetches payload.
- Zod validates the envelope.
- Frontend checks that `game` and `levelKey` are supported.
- Existing editor load logic receives the restored editor data through a dedicated restore function.
- If the saved data references external assets that are not yet stored server-side, the UI clearly asks for the missing local asset file before opening the editor.

## Security And Privacy

- Only the owner can list, load, update, or delete their saved levels.
- Never trust user ids from request bodies; use the authenticated session.
- Limit payload size.
- Hash uploaded payload bytes.
- Log request ids and error codes, not raw level payloads.
- Treat saved level data as private user content.
- Add rate limits to auth and save endpoints.
- Configure CORS to the frontend origin only.
- Keep secrets out of source control and document local development setup through environment variables or user secrets.

## Local Development

Add backend local configuration:

- PostgreSQL connection string.
- Google OAuth client id and secret.
- Frontend base URL, usually `http://localhost:5173`.
- Backend URL, usually `http://localhost:5000` or `https://localhost:5001`.

Local commands to document after implementation:

```bash
dotnet restore backend/PangeaRSEdit.sln
dotnet test backend/PangeaRSEdit.sln
dotnet run --project backend/PangeaRSEdit.Api
```

Consider adding a root-level script later for running frontend and backend together, but keep the backend independently runnable first.

## Implementation Phases

### Phase 1: Backend Skeleton

- Create the .NET solution and projects.
- Add health check endpoint.
- Add configuration binding and validation.
- Add typed result helpers or a project-approved result package for C#.
- Add test project and baseline API integration test.

### Phase 2: Authentication

- Configure Google OAuth2.
- Add local user creation and external login lookup.
- Add cookie session configuration.
- Add `GET /api/me` and sign out.
- Add frontend sign in, sign out, and user profile state.

### Phase 3: Saved Level Metadata

- Add database schema and migrations.
- Add saved level domain model.
- Add create, list, get, update, and soft delete application services.
- Add ownership checks on all saved level use cases.
- Add optimistic concurrency for updates.

### Phase 4: Payload Storage

- Add payload storage abstraction.
- Implement compressed database payload storage.
- Add payload size, hash, and version validation.
- Add tests for metadata mismatch, unsupported version, and oversized payloads.

### Phase 5: Frontend Save And Restore

- Add Zod schemas for auth and saved level APIs.
- Add `ResultAsync` API client functions.
- Add save action from the editor.
- Add saved level browser.
- Add restore flow into existing level load state.
- Add conflict handling for stale `rowVersion` values.

### Phase 6: Deployment Readiness

- Add production configuration documentation.
- Add database migration process.
- Add HTTPS and cookie settings for the deployed domain.
- Add basic rate limiting.
- Add structured logging.
- Add CI checks for backend tests.

## Testing Strategy

Backend tests:

- Auth callback creates a user for a new Google subject.
- Existing Google subject maps back to the same user.
- Unauthenticated saved level requests return 401.
- Users cannot access another user's saved levels.
- Create stores expected metadata and payload hash.
- Update rejects stale `rowVersion`.
- Restore returns the exact saved payload.
- Soft deleted levels disappear from list and get endpoints.

Frontend tests:

- API schemas reject malformed saved level responses.
- Save action sends game, level key, and payload version.
- Restore rejects a saved level for an unsupported game.
- Restore rejects a payload whose game or level key does not match metadata.
- UI handles unauthenticated, loading, success, validation error, and conflict states.

Manual verification:

- Sign in with Google locally.
- Load a local level.
- Save it to the backend.
- Refresh the browser.
- Restore the saved level.
- Edit and save again.
- Confirm a second browser session can list the same user's saved levels after sign in.

## Open Questions

- Which games should be enabled for cloud saves first?
- What is the canonical `levelKey` for each supported game when a user uploads an arbitrary local file?
- Should restored saves include the original source file bytes, or only the parsed editor state?
- Are texture/model assets in scope for server storage in the first version?
- What deployment target should drive auth cookie, CORS, and database choices?
- Should users be able to keep multiple named saves for the same game and level, or should the UI default to one autosave slot plus manual duplicates?
