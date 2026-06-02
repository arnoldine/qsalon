using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickSalon.Api.Contracts;
using QuickSalon.Api.Domain;
using QuickSalon.Api.Infrastructure;

namespace QuickSalon.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,SystemAdmin")]
[Route("api/superadmin")]
public class SuperAdminController(
    SalonDbContext db,
    PasswordHasher<AppUser> passwordHasher,
    IAuditService audit) : ControllerBase
{
    [HttpGet("tenants")]
    public async Task<ActionResult<IEnumerable<object>>> GetTenants([FromQuery] string? q, CancellationToken cancellationToken)
    {
        var query = db.Tenants.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q))
        {
            query = query.Where(x =>
                x.Name.Contains(q) ||
                x.Slug.Contains(q) ||
                (x.ContactEmail != null && x.ContactEmail.Contains(q)));
        }

        var tenants = await query
            .OrderBy(x => x.Name)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Slug,
                x.ContactEmail,
                x.Phone,
                x.Address,
                x.IsActive,
                x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(tenants);
    }

    [HttpPost("tenants")]
    public async Task<ActionResult<object>> CreateTenant([FromBody] TenantAdminRequest request, CancellationToken cancellationToken)
    {
        var slug = request.Slug.Trim().ToLowerInvariant();
        var exists = await db.Tenants.AnyAsync(x => x.Slug == slug, cancellationToken);
        if (exists)
        {
            return BadRequest(new { message = "Tenant slug already exists." });
        }

        var entity = new Tenant
        {
            Name = request.Name.Trim(),
            Slug = slug,
            ContactEmail = request.ContactEmail,
            Phone = request.Phone,
            Address = request.Address,
            IsActive = request.IsActive
        };

        db.Tenants.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Create", nameof(Tenant), entity.Id.ToString(), request, cancellationToken);

        return Ok(entity);
    }

    [HttpPut("tenants/{id:guid}")]
    public async Task<ActionResult<object>> UpdateTenant(Guid id, [FromBody] TenantAdminRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.Tenants.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        var slug = request.Slug.Trim().ToLowerInvariant();
        var duplicate = await db.Tenants.AnyAsync(x => x.Id != id && x.Slug == slug, cancellationToken);
        if (duplicate)
        {
            return BadRequest(new { message = "Tenant slug already exists." });
        }

        entity.Name = request.Name.Trim();
        entity.Slug = slug;
        entity.ContactEmail = request.ContactEmail;
        entity.Phone = request.Phone;
        entity.Address = request.Address;
        entity.IsActive = request.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Update", nameof(Tenant), entity.Id.ToString(), request, cancellationToken);
        return Ok(entity);
    }

    [HttpPatch("tenants/{id:guid}/status")]
    public async Task<ActionResult<object>> SetTenantStatus(Guid id, [FromBody] StatusToggleRequest request, CancellationToken cancellationToken)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (tenant is null)
        {
            return NotFound();
        }

        tenant.IsActive = request.IsActive;
        tenant.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Status", nameof(Tenant), tenant.Id.ToString(), request, cancellationToken);

        return Ok(new { tenant.Id, tenant.IsActive });
    }

    [HttpGet("branches")]
    public async Task<ActionResult<IEnumerable<object>>> GetBranches([FromQuery] Guid? tenantId, [FromQuery] string? q, CancellationToken cancellationToken)
    {
        var query = db.Branches.IgnoreQueryFilters().AsNoTracking();

        if (tenantId.HasValue)
        {
            query = query.Where(x => x.TenantId == tenantId.Value);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            query = query.Where(x => x.Name.Contains(q) || (x.Address != null && x.Address.Contains(q)));
        }

        var branches = await (
            from b in query
            join t in db.Tenants.AsNoTracking() on b.TenantId equals t.Id
            orderby t.Name, b.Name
            select new
            {
                b.Id,
                b.TenantId,
                TenantName = t.Name,
                b.Name,
                b.Address,
                b.Phone,
                b.CreatedAt
            }).ToListAsync(cancellationToken);

        return Ok(branches);
    }

    [HttpPost("branches")]
    public async Task<ActionResult<object>> CreateBranch([FromBody] BranchAdminRequest request, CancellationToken cancellationToken)
    {
        var tenantExists = await db.Tenants.AnyAsync(x => x.Id == request.TenantId, cancellationToken);
        if (!tenantExists)
        {
            return BadRequest(new { message = "Tenant not found." });
        }

        var entity = new Branch
        {
            TenantId = request.TenantId,
            Name = request.Name.Trim(),
            Address = request.Address,
            Phone = request.Phone
        };

        db.Branches.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Create", nameof(Branch), entity.Id.ToString(), request, cancellationToken);
        return Ok(entity);
    }

    [HttpPut("branches/{id:guid}")]
    public async Task<ActionResult<object>> UpdateBranch(Guid id, [FromBody] BranchAdminRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.Branches.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        var tenantExists = await db.Tenants.AnyAsync(x => x.Id == request.TenantId, cancellationToken);
        if (!tenantExists)
        {
            return BadRequest(new { message = "Tenant not found." });
        }

        entity.TenantId = request.TenantId;
        entity.Name = request.Name.Trim();
        entity.Address = request.Address;
        entity.Phone = request.Phone;
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Update", nameof(Branch), entity.Id.ToString(), request, cancellationToken);
        return Ok(entity);
    }

    [HttpDelete("branches/{id:guid}")]
    public async Task<ActionResult> DeleteBranch(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.Branches.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        var hasReferences =
            await db.Users.IgnoreQueryFilters().AnyAsync(x => x.BranchId == id, cancellationToken) ||
            await db.Customers.IgnoreQueryFilters().AnyAsync(x => x.BranchId == id, cancellationToken) ||
            await db.Employees.IgnoreQueryFilters().AnyAsync(x => x.BranchId == id, cancellationToken) ||
            await db.EmployeeSchedules.IgnoreQueryFilters().AnyAsync(x => x.BranchId == id, cancellationToken) ||
            await db.Appointments.IgnoreQueryFilters().AnyAsync(x => x.BranchId == id, cancellationToken) ||
            await db.Invoices.IgnoreQueryFilters().AnyAsync(x => x.BranchId == id, cancellationToken) ||
            await db.InvoiceItems.IgnoreQueryFilters().AnyAsync(x => x.BranchId == id, cancellationToken) ||
            await db.Payments.IgnoreQueryFilters().AnyAsync(x => x.BranchId == id, cancellationToken) ||
            await db.Suppliers.IgnoreQueryFilters().AnyAsync(x => x.BranchId == id, cancellationToken) ||
            await db.Products.IgnoreQueryFilters().AnyAsync(x => x.BranchId == id, cancellationToken) ||
            await db.InventoryTransactions.IgnoreQueryFilters().AnyAsync(x => x.BranchId == id, cancellationToken) ||
            await db.Commissions.IgnoreQueryFilters().AnyAsync(x => x.BranchId == id, cancellationToken);

        if (hasReferences)
        {
            return BadRequest(new { message = "Branch cannot be deleted because it is referenced by existing records." });
        }

        db.Branches.Remove(entity);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return BadRequest(new { message = "Branch cannot be deleted because it is referenced by existing records." });
        }

        await audit.LogAsync("Delete", nameof(Branch), entity.Id.ToString(), null, cancellationToken);
        return NoContent();
    }

    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<object>>> GetUsers([FromQuery] Guid? tenantId, [FromQuery] Guid? branchId, [FromQuery] string? q, CancellationToken cancellationToken)
    {
        var users = db.Users.IgnoreQueryFilters().AsNoTracking();

        if (tenantId.HasValue)
        {
            users = users.Where(x => x.TenantId == tenantId.Value);
        }

        if (branchId.HasValue)
        {
            users = users.Where(x => x.BranchId == branchId.Value);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            users = users.Where(x =>
                x.FullName.Contains(q) ||
                x.Username.Contains(q) ||
                (x.Email != null && x.Email.Contains(q)));
        }

        var data = await (
            from u in users
            join t in db.Tenants.AsNoTracking() on u.TenantId equals t.Id
            join b in db.Branches.IgnoreQueryFilters().AsNoTracking() on u.BranchId equals b.Id
            orderby t.Name, b.Name, u.FullName
            select new
            {
                u.Id,
                u.TenantId,
                TenantName = t.Name,
                u.BranchId,
                BranchName = b.Name,
                u.FullName,
                u.Username,
                u.Email,
                u.IsActive,
                u.CreatedAt
            }).ToListAsync(cancellationToken);

        var userIds = data.Select(x => x.Id).ToList();
        var roleNames = await (
            from ur in db.UserRoles.AsNoTracking()
            join r in db.Roles.IgnoreQueryFilters().AsNoTracking() on ur.RoleId equals r.Id
            where userIds.Contains(ur.UserId)
            select new { ur.UserId, r.Name }
        ).ToListAsync(cancellationToken);

        var firstRoleByUser = roleNames
            .GroupBy(x => x.UserId)
            .ToDictionary(x => x.Key, x => x.Select(v => v.Name).FirstOrDefault() ?? string.Empty);

        return Ok(data.Select(x => new
        {
            x.Id,
            x.TenantId,
            x.TenantName,
            x.BranchId,
            x.BranchName,
            x.FullName,
            x.Username,
            x.Email,
            x.IsActive,
            Role = firstRoleByUser.TryGetValue(x.Id, out var role) ? role : string.Empty,
            x.CreatedAt
        }));
    }

    [HttpPost("users")]
    public async Task<ActionResult<object>> CreateUser([FromBody] UserAdminRequest request, CancellationToken cancellationToken)
    {
        var tenant = await db.Tenants.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.TenantId, cancellationToken);
        if (tenant is null)
        {
            return BadRequest(new { message = "Tenant not found." });
        }

        var branch = await db.Branches.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.BranchId, cancellationToken);
        if (branch is null || branch.TenantId != request.TenantId)
        {
            return BadRequest(new { message = "Branch not found for selected tenant." });
        }

        var duplicateUsername = await db.Users.IgnoreQueryFilters().AnyAsync(x => x.Username == request.Username, cancellationToken);
        if (duplicateUsername)
        {
            return BadRequest(new { message = "Username already exists." });
        }

        var role = await db.Roles.IgnoreQueryFilters().FirstOrDefaultAsync(
            x => x.TenantId == request.TenantId && x.Name == request.Role,
            cancellationToken);
        if (role is null)
        {
            return BadRequest(new { message = "Role not found in tenant." });
        }

        var user = new AppUser
        {
            TenantId = request.TenantId,
            BranchId = request.BranchId,
            FullName = request.FullName.Trim(),
            Username = request.Username.Trim(),
            Email = request.Email,
            IsActive = request.IsActive,
            PasswordHash = string.Empty
        };

        user.PasswordHash = passwordHasher.HashPassword(user, string.IsNullOrWhiteSpace(request.Password) ? "ChangeMe123!" : request.Password.Trim());

        db.Users.Add(user);
        db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Create", nameof(AppUser), user.Id.ToString(), new { request.Username, request.Role }, cancellationToken);

        return Ok(new { user.Id, user.Username });
    }

    [HttpPut("users/{id:guid}")]
    public async Task<ActionResult<object>> UpdateUser(Guid id, [FromBody] UserAdminRequest request, CancellationToken cancellationToken)
    {
        var user = await db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        var branch = await db.Branches.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.BranchId, cancellationToken);
        if (branch is null || branch.TenantId != request.TenantId)
        {
            return BadRequest(new { message = "Branch not found for selected tenant." });
        }

        var duplicateUsername = await db.Users.IgnoreQueryFilters().AnyAsync(x => x.Id != id && x.Username == request.Username, cancellationToken);
        if (duplicateUsername)
        {
            return BadRequest(new { message = "Username already exists." });
        }

        var role = await db.Roles.IgnoreQueryFilters().FirstOrDefaultAsync(
            x => x.TenantId == request.TenantId && x.Name == request.Role,
            cancellationToken);
        if (role is null)
        {
            return BadRequest(new { message = "Role not found in tenant." });
        }

        user.TenantId = request.TenantId;
        user.BranchId = request.BranchId;
        user.FullName = request.FullName.Trim();
        user.Username = request.Username.Trim();
        user.Email = request.Email;
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password.Trim());
        }

        var userRoles = await db.UserRoles.Where(x => x.UserId == user.Id).ToListAsync(cancellationToken);
        db.UserRoles.RemoveRange(userRoles);
        db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Update", nameof(AppUser), user.Id.ToString(), new { request.Username, request.Role }, cancellationToken);

        return Ok(new { user.Id, user.Username });
    }

    [HttpPatch("users/{id:guid}/status")]
    public async Task<ActionResult<object>> SetUserStatus(Guid id, [FromBody] StatusToggleRequest request, CancellationToken cancellationToken)
    {
        var user = await db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Status", nameof(AppUser), user.Id.ToString(), request, cancellationToken);

        return Ok(new { user.Id, user.IsActive });
    }

    [HttpDelete("users/{id:guid}")]
    public async Task<ActionResult> DeleteUser(Guid id, CancellationToken cancellationToken)
    {
        var user = await db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        var userRoles = await db.UserRoles.Where(x => x.UserId == user.Id).ToListAsync(cancellationToken);
        db.UserRoles.RemoveRange(userRoles);
        db.Users.Remove(user);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Delete", nameof(AppUser), user.Id.ToString(), new { user.Username }, cancellationToken);

        return NoContent();
    }
}
