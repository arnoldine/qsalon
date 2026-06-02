using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using QuickSalon.Api.Domain;

namespace QuickSalon.Api.Infrastructure;

public record LoginRequest(string Username, string Password);
public record LoginResponse(
    string Token,
    DateTime ExpiresAt,
    Guid TenantId,
    Guid BranchId,
    string FullName,
    string TenantName,
    string BranchName,
    IReadOnlyCollection<string> Roles);

public interface ITokenService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
}

public class TokenService(
    SalonDbContext dbContext,
    IConfiguration configuration,
    PasswordHasher<AppUser> passwordHasher) : ITokenService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .FirstOrDefaultAsync(x => x.Username == request.Username && x.IsActive, cancellationToken);

        if (user is null)
        {
            return null;
        }

        var verifyResult = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verifyResult == PasswordVerificationResult.Failed)
        {
            return null;
        }

        var roles = await (from ur in dbContext.UserRoles
                           join r in dbContext.Roles on ur.RoleId equals r.Id
                           where ur.UserId == user.Id
                           select r.Name).ToListAsync(cancellationToken);

        var tenant = await dbContext.Tenants.AsNoTracking().FirstOrDefaultAsync(x => x.Id == user.TenantId, cancellationToken);
        var branch = await dbContext.Branches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == user.BranchId, cancellationToken);

        var jwtKey = configuration["Jwt:Key"] ?? "super-secret-key-for-local-dev-only";
        var issuer = configuration["Jwt:Issuer"] ?? "QuickSalon";
        var audience = configuration["Jwt:Audience"] ?? "QuickSalonClients";
        var expiresMinutes = int.TryParse(configuration["Jwt:ExpiresMinutes"], out var m) ? m : 120;

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.FullName),
            new("tenant_id", user.TenantId.ToString()),
            new("branch_id", user.BranchId.ToString()),
            new("username", user.Username)
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresAt = DateTime.UtcNow.AddMinutes(expiresMinutes);

        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: expiresAt,
            signingCredentials: creds);

        var serialized = new JwtSecurityTokenHandler().WriteToken(token);

        return new LoginResponse(
            serialized,
            expiresAt,
            user.TenantId,
            user.BranchId,
            user.FullName,
            tenant?.Name ?? "Salon",
            branch?.Name ?? "Main Branch",
            roles);
    }
}

public interface IAuditService
{
    Task LogAsync(string action, string entityName, string entityId, object? changes, CancellationToken cancellationToken);
}

public class AuditService(SalonDbContext dbContext, ICurrentTenant currentTenant) : IAuditService
{
    public async Task LogAsync(string action, string entityName, string entityId, object? changes, CancellationToken cancellationToken)
    {
        if (currentTenant.TenantId == Guid.Empty)
        {
            return;
        }

        var log = new AuditLog
        {
            TenantId = currentTenant.TenantId,
            UserId = currentTenant.UserId,
            Action = action,
            EntityName = entityName,
            EntityId = entityId,
            ChangesJson = changes is null ? null : System.Text.Json.JsonSerializer.Serialize(changes)
        };

        dbContext.AuditLogs.Add(log);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}

public static class SeedData
{
    public static async Task EnsureSeededAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SalonDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<PasswordHasher<AppUser>>();

        await db.Database.MigrateAsync();

        if (await db.Tenants.AnyAsync())
        {
            return;
        }

        var tenant = new Tenant { Name = "QuickSalon Demo", Slug = "quicksalon-demo", ContactEmail = "admin@quicksalon.local" };
        db.Tenants.Add(tenant);

        db.TenantSettings.Add(new TenantSetting
        {
            TenantId = tenant.Id,
            SalonName = "QuickSalon Demo",
            Email = "admin@quicksalon.local",
            Phone = "+10000000000",
            Address = "Demo Address",
            OpeningHours = "08:00 - 20:00",
            DefaultCurrency = "GHS",
            TaxRate = 0m,
            ReceiptFooter = "Thank you for choosing QuickSalon",
            EnableAppointmentReminders = false
        });

        var branch = new Branch { TenantId = tenant.Id, Name = "Main Branch", Address = "Demo Address" };
        db.Branches.Add(branch);

        var adminRole = new Role { TenantId = tenant.Id, Name = "Admin", Description = "Tenant administrator" };
        db.Roles.Add(adminRole);

        var admin = new AppUser
        {
            TenantId = tenant.Id,
            BranchId = branch.Id,
            FullName = "System Admin",
            Username = "admin",
            Email = "admin@quicksalon.local",
            PasswordHash = string.Empty,
            IsActive = true
        };
        admin.PasswordHash = passwordHasher.HashPassword(admin, "Admin@123");
        db.Users.Add(admin);

        db.UserRoles.Add(new UserRole { UserId = admin.Id, RoleId = adminRole.Id });
        await db.SaveChangesAsync();
    }
}
