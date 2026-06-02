using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickSalon.Api.Contracts;
using QuickSalon.Api.Domain;
using QuickSalon.Api.Infrastructure;

namespace QuickSalon.Api.Controllers;

public class ServiceCategoriesController(SalonDbContext db, ICurrentTenant currentTenant, IAuditService audit) : BaseApiController(currentTenant)
{
    [HttpGet("/api/service-categories")]
    public async Task<ActionResult<IEnumerable<ServiceCategory>>> GetAll(CancellationToken cancellationToken)
        => Ok(await db.ServiceCategories.AsNoTracking().Where(x => x.BranchId == BranchId).OrderBy(x => x.Name).ToListAsync(cancellationToken));

    [HttpPost("/api/service-categories")]
    public async Task<ActionResult<ServiceCategory>> Create([FromBody] ServiceCategoryRequest request, CancellationToken cancellationToken)
    {
        var entity = new ServiceCategory { TenantId = TenantId, BranchId = BranchId, Name = request.Name, IsActive = request.IsActive };
        db.ServiceCategories.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Create", nameof(ServiceCategory), entity.Id.ToString(), request, cancellationToken);
        return Created($"/api/service-categories/{entity.Id}", entity);
    }

    [HttpPut("/api/service-categories/{id:guid}")]
    public async Task<ActionResult<ServiceCategory>> Update(Guid id, [FromBody] ServiceCategoryRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.ServiceCategories.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (entity is null) return NotFound();
        entity.Name = request.Name;
        entity.IsActive = request.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Update", nameof(ServiceCategory), entity.Id.ToString(), request, cancellationToken);
        return Ok(entity);
    }

    [HttpDelete("/api/service-categories/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.ServiceCategories.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (entity is null) return NotFound();
        db.ServiceCategories.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Delete", nameof(ServiceCategory), id.ToString(), null, cancellationToken);
        return NoContent();
    }
}

    public class ServicesController(SalonDbContext db, ICurrentTenant currentTenant, IAuditService audit) : BaseApiController(currentTenant)
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SalonService>>> GetAll(CancellationToken cancellationToken)
        => Ok(await db.Services.AsNoTracking().Where(x => x.BranchId == BranchId).OrderBy(x => x.Name).ToListAsync(cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SalonService>> Get(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.Services.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    public async Task<ActionResult<SalonService>> Create([FromBody] ServiceRequest request, CancellationToken cancellationToken)
    {
        var entity = new SalonService
        {
            TenantId = TenantId,
            BranchId = BranchId,
            Name = request.Name,
            CategoryId = request.CategoryId,
            DurationMinutes = request.DurationMinutes,
            Price = request.Price,
            IsActive = request.IsActive
        };

        db.Services.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Create", nameof(SalonService), entity.Id.ToString(), request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SalonService>> Update(Guid id, [FromBody] ServiceRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.Services.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (entity is null) return NotFound();

        entity.Name = request.Name;
        entity.CategoryId = request.CategoryId;
        entity.DurationMinutes = request.DurationMinutes;
        entity.Price = request.Price;
        entity.IsActive = request.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Update", nameof(SalonService), entity.Id.ToString(), request, cancellationToken);
        return Ok(entity);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.Services.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (entity is null) return NotFound();

        db.Services.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Delete", nameof(SalonService), id.ToString(), null, cancellationToken);
        return NoContent();
    }
}
