# QuickSalon Super Admin Configuration Manual

This guide is for platform-level administrators responsible for configuring and operating QuickSalon across environments.

## 1. Purpose and Scope

Use this manual to:
- Configure backend and frontend environment settings.
- Bootstrap and verify admin access.
- Manage super-admin level access safely.
- Run and validate tenant settings, security, and daily operations.

This manual reflects the current implementation in this workspace.

## 2. Current Architecture Snapshot

- Backend API: ASP.NET Core 9
- Database: PostgreSQL
- Frontend: React + Vite
- Auth: JWT bearer tokens
- Tenant model: tenant and branch claims in JWT (`tenant_id`, `branch_id`)

Default local endpoints:
- API: `http://localhost:5013`
- Frontend dev: usually `http://localhost:5173+` (auto-increments if port is occupied)

## 3. Configuration Files

### Backend

- `QuickSalon.Api/appsettings.Development.json`
- `QuickSalon.Api/Program.cs`

Important keys in development:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5433;Database=quicksalon_dev;Username=postgres;Password=postgres"
  },
  "Jwt": {
    "Key": "super-secret-key-for-local-dev-only",
    "Issuer": "QuickSalon",
    "Audience": "QuickSalonClients",
    "ExpiresMinutes": 120
  }
}
```

### Frontend

- `quicksalon-web/src/lib/api.ts`

Frontend API base URL:
- Uses `VITE_API_BASE_URL` if defined.
- Falls back to `http://localhost:5013`.

## 4. Required Super Admin Controls

## 4.1 Secrets and Security Baseline

For staging/production, you must change:
- `Jwt:Key` to a strong, private secret (minimum 32+ random chars).
- Database credentials (do not keep defaults).
- CORS policy to allow only approved domains.

Never commit production secrets to source control.

## 4.2 Migrations Policy

Startup runs `MigrateAsync`, so schema updates are migration-driven.

Operational policy:
1. Generate migration for model changes.
2. Apply migration in target environment.
3. Start API and verify migration history.

Do not use `EnsureCreated` for evolving environments.

## 4.3 Auth and Role Model

Login endpoint:
- `POST /api/auth/login`

Profile endpoint:
- `GET /api/auth/me`

Settings endpoint protection:
- `SettingsController` is restricted to roles:
  - `Admin`
  - `SystemAdmin`
  - `SalonOwner`

This means receptionist and other non-privileged users are denied settings updates at API layer.

## 5. Bootstrap and Access

Seeded default account (fresh database only):
- Username: `admin`
- Password: `Admin@123`
- Role: `Admin`

Immediate post-bootstrap actions:
1. Log in and validate `GET /api/auth/me`.
2. Rotate default admin password.
3. Create named admin users for traceability.
4. Disable shared/default credentials.

## 6. Environment Setup Checklist

## 6.1 Local Development

1. Ensure PostgreSQL is running and reachable on configured port.
2. Verify `appsettings.Development.json` connection string.
3. Start backend:

```powershell
Set-Location "c:\Backup old\QuickSalon\QuickSalon.Api"
dotnet run
```

4. Start frontend:

```powershell
Set-Location "c:\Backup old\QuickSalon\quicksalon-web"
npm run dev
```

5. Confirm frontend resolves API calls to `http://localhost:5013`.

## 6.2 Production-Style Baseline

- Store config in environment-specific secure configuration store.
- Use TLS/HTTPS for all public endpoints.
- Restrict CORS to known app domains only.
- Use strong JWT key with rotation policy.
- Use least-privilege DB account.

## 7. Super Admin Verification Runbook

Run this after any major configuration change.

1. Authentication
- Login with admin credentials.
- Confirm JWT is issued and not expired unexpectedly.

2. Profile context
- Call `GET /api/auth/me`.
- Verify tenant and branch claims are correct.

3. Settings authorization
- As admin: `GET/PUT /api/settings/tenant` should succeed.
- As non-admin (for example receptionist): settings `PUT` must return `403`.

4. Tenant isolation
- Create test record under tenant A.
- Verify tenant B cannot read tenant A data.

5. CORS
- Preflight from frontend origin must return allowed origin and success status.

## 8. Operational Commands

Build checks:

```powershell
Set-Location "c:\Backup old\QuickSalon\QuickSalon.Api"
dotnet build

Set-Location "c:\Backup old\QuickSalon\quicksalon-web"
npm run build
```

Migration commands:

```powershell
Set-Location "c:\Backup old\QuickSalon\QuickSalon.Api"
dotnet ef migrations add <MigrationName>
dotnet ef database update
```

## 9. Troubleshooting

Port already in use (`5013`):
- Stop existing process listening on the port, then restart API.

401 on login:
- Verify correct credentials and target database instance.
- Confirm seeded user exists in current DB.

403 on settings update:
- Expected for non-admin roles.
- Verify user role includes one of: `Admin`, `SystemAdmin`, `SalonOwner`.

CORS error in browser:
- Confirm request origin is `localhost` or `127.0.0.1` in development.
- Ensure API is running and reachable at configured base URL.

## 10. Change Control Recommendations

Before release:
1. Export and review effective configuration values (without secrets).
2. Confirm migration state is current.
3. Validate admin-only endpoint restrictions.
4. Run tenant isolation spot checks.
5. Archive audit and deployment notes.

## 11. Super Admin Hardening Backlog (Recommended)

- Add dedicated user management endpoints for role assignment.
- Add password reset and forced credential rotation workflows.
- Add refresh-token support and token revocation.
- Add per-role API authorization across all sensitive controllers.
- Add environment-specific CORS config instead of permissive localhost host check.
- Add health-check and readiness endpoints for ops monitoring.
