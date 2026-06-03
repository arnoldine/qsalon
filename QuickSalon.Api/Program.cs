using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using QuickSalon.Api.Domain;
using QuickSalon.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentTenant, CurrentTenant>();
builder.Services.AddScoped<TenantScopeFilter>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<PasswordHasher<AppUser>>();

builder.Services.AddDbContext<SalonDbContext>(options =>
{
    var provider = builder.Configuration["DatabaseProvider"] ?? "Postgres";
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase)
            ? "Server=(localdb)\\MSSQLLocalDB;Database=quicksalon;Trusted_Connection=True;TrustServerCertificate=True;"
            : "Host=localhost;Port=5432;Database=quicksalon;Username=postgres;Password=postgres");

    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        options.UseSqlServer(connectionString);
    }
    else
    {
        options.UseNpgsql(connectionString);
    }
});

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
        {
            var allowedOrigins = builder.Configuration.GetSection("App:AllowedOrigins").Get<string[]>()
                ?? [builder.Configuration["App:CorsOrigin"] ?? "http://localhost:5173"];

            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
});

var jwtKey = builder.Configuration["Jwt:Key"] ?? "super-secret-key-for-local-dev-only";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "QuickSalon";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "QuickSalonClients";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "QuickSalon API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // Never cache index.html so the browser always fetches the latest
        // entry-point, which references the correct hashed JS/CSS bundles.
        var file = ctx.File.Name;
        if (file.Equals("index.html", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
            ctx.Context.Response.Headers["Pragma"] = "no-cache";
            ctx.Context.Response.Headers["Expires"] = "0";
        }
    }
});

app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
// Fallback: serve index.html for all unmatched routes (SPA routing)
app.MapGet("/{**path}", async context =>
{
    var path = context.Request.Path.Value ?? "";
    if (!path.StartsWith("/api") && !path.StartsWith("/assets"))
    {
        context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        context.Response.Headers["Pragma"] = "no-cache";
        context.Response.Headers["Expires"] = "0";
        context.Response.ContentType = "text/html";
        var wwwroot = Path.Combine(AppContext.BaseDirectory, "wwwroot", "index.html");
        if (File.Exists(wwwroot))
        {
            await context.Response.SendFileAsync(wwwroot);
            return;
        }
    }
    context.Response.StatusCode = 404;
}).ExcludeFromDescription();

try
{
    await SeedData.EnsureSeededAsync(app.Services);
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Database migration/seed failed during startup.");
    if (app.Environment.IsDevelopment())
    {
        throw;
    }
}

app.Run();
