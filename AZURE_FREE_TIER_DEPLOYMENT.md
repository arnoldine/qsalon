# QuickSalon Azure Free Tier Deployment

QuickSalon is now set up so the React frontend is published into the ASP.NET Core app during `dotnet publish`. That means a single Azure App Service can host both the API and the UI.

## Deployment shape

- Host: Azure App Service Free tier (`F1`)
- App type: ASP.NET Core 9
- Frontend: bundled into `QuickSalon.Api` publish output under `wwwroot`
- API base URL: same-origin in production, localhost in development

## Required app settings

Set these in the App Service configuration:

- `ASPNETCORE_ENVIRONMENT=Production`
- `ConnectionStrings__DefaultConnection=<your PostgreSQL connection string>`
- `Jwt__Key=<strong secret>`
- `Jwt__Issuer=QuickSalon`
- `Jwt__Audience=QuickSalonClients`
- `App__AllowedOrigins` only if you later split the frontend onto a separate host

## Publish flow

1. Build the frontend and API together with `dotnet publish QuickSalon.Api -c Release`.
2. Deploy the publish folder to Azure App Service.
3. Make sure the database connection string points to a reachable PostgreSQL instance.

## Currency

- The tenant defaults now use `GHS`.
- POS, dashboard, reports, invoice item entry, and employee commission displays now format money with GHS by default.