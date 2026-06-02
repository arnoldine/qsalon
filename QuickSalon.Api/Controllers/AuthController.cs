using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickSalon.Api.Contracts;
using QuickSalon.Api.Infrastructure;

namespace QuickSalon.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/[controller]")]
public class AuthController(ITokenService tokenService) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var response = await tokenService.LoginAsync(request, cancellationToken);
        if (response is null)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        return Ok(response);
    }
}

[ApiController]
[Authorize]
[Route("api/auth")]
public class AuthProfileController(SalonDbContext db, ICurrentTenant currentTenant) : ControllerBase
{
    [HttpGet("me")]
    public async Task<ActionResult<AuthProfileResponse>> Me(CancellationToken cancellationToken)
    {
        if (currentTenant.UserId is null || currentTenant.TenantId == Guid.Empty || currentTenant.BranchId == Guid.Empty)
        {
            return Unauthorized(new { message = "Tenant context is missing." });
        }

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == currentTenant.UserId.Value, cancellationToken);
        if (user is null)
        {
            return Unauthorized();
        }

        var tenant = await db.Tenants.AsNoTracking().FirstOrDefaultAsync(x => x.Id == user.TenantId, cancellationToken);
        var branch = await db.Branches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == user.BranchId, cancellationToken);
        var roles = await (from ur in db.UserRoles
                           join r in db.Roles on ur.RoleId equals r.Id
                           where ur.UserId == user.Id
                           select r.Name).ToListAsync(cancellationToken);

        return Ok(new AuthProfileResponse(
            user.Id,
            user.FullName,
            user.TenantId,
            tenant?.Name ?? "Salon",
            user.BranchId,
            branch?.Name ?? "Main Branch",
            roles));
    }
}
