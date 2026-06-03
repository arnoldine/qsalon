# ─── Stage 1: Build React frontend ───────────────────────────────────────────
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY quicksalon-web/package*.json ./
RUN npm ci --silent
COPY quicksalon-web/ ./
RUN npm run build

# ─── Stage 2: Build .NET API ──────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS api-build
WORKDIR /app/api
COPY QuickSalon.Api/*.csproj ./
RUN dotnet restore
COPY QuickSalon.Api/ ./
RUN dotnet publish -c Release -o /publish --no-restore /p:SkipFrontendBuild=true

# ─── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app

# Copy published API
COPY --from=api-build /publish ./

# Copy frontend dist into wwwroot (served as static files by ASP.NET)
COPY --from=frontend-build /app/frontend/dist ./wwwroot

# Non-root user for security
RUN addgroup -S salon && adduser -S salon -G salon
RUN chown -R salon:salon /app
USER salon

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

EXPOSE 8080
ENTRYPOINT ["dotnet", "QuickSalon.Api.dll"]
