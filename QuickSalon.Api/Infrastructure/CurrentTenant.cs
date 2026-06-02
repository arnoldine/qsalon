using System.Security.Claims;

namespace QuickSalon.Api.Infrastructure;

public interface ICurrentTenant
{
    Guid TenantId { get; }
    Guid BranchId { get; }
    Guid? UserId { get; }
}

public class CurrentTenant(IHttpContextAccessor httpContextAccessor) : ICurrentTenant
{
    public Guid TenantId => ParseGuidClaim("tenant_id");
    public Guid BranchId => ParseGuidClaim("branch_id");
    public Guid? UserId => TryParseGuidClaim(ClaimTypes.NameIdentifier);

    private Guid ParseGuidClaim(string key)
    {
        var value = httpContextAccessor.HttpContext?.User?.FindFirstValue(key);
        if (Guid.TryParse(value, out var id))
        {
            return id;
        }

        return Guid.Empty;
    }

    private Guid? TryParseGuidClaim(string key)
    {
        var value = httpContextAccessor.HttpContext?.User?.FindFirstValue(key);
        if (Guid.TryParse(value, out var id))
        {
            return id;
        }

        return null;
    }
}
