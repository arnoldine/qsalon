using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickSalon.Api.Contracts;
using QuickSalon.Api.Domain;
using QuickSalon.Api.Infrastructure;

namespace QuickSalon.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/expenses")]
[ServiceFilter(typeof(TenantScopeFilter))]
public class ExpensesController(SalonDbContext db, ICurrentTenant tenant, IAuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetExpenses(
        [FromQuery] string? category,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var query = db.Expenses.AsNoTracking()
            .Where(x => x.BranchId == tenant.BranchId);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(x => x.Category == category);
        if (from.HasValue) query = query.Where(x => x.ExpenseDate >= from.Value);
        if (to.HasValue)   query = query.Where(x => x.ExpenseDate <= to.Value);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(x => x.ExpenseDate).ThenByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new { items, totalCount = total });
    }

    [HttpGet("categories")]
    public async Task<ActionResult<IEnumerable<string>>> GetCategories(CancellationToken cancellationToken)
    {
        var cats = await db.Expenses.AsNoTracking()
            .Where(x => x.BranchId == tenant.BranchId)
            .Select(x => x.Category)
            .Distinct()
            .OrderBy(x => x)
            .ToListAsync(cancellationToken);

        // Always include default categories
        var defaults = new[] { "Rent", "Utilities", "Salaries", "Supplies", "Marketing", "Equipment", "Maintenance", "Other" };
        return Ok(defaults.Union(cats).OrderBy(x => x));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<object>> GetSummary([FromQuery] int year, [FromQuery] int month, CancellationToken cancellationToken)
    {
        var from = new DateOnly(year, month, 1);
        var to = from.AddMonths(1).AddDays(-1);

        var byCategory = await db.Expenses.AsNoTracking()
            .Where(x => x.BranchId == tenant.BranchId && x.ExpenseDate >= from && x.ExpenseDate <= to)
            .GroupBy(x => x.Category)
            .Select(g => new { category = g.Key, total = g.Sum(x => x.Amount), count = g.Count() })
            .OrderByDescending(x => x.total)
            .ToListAsync(cancellationToken);

        return Ok(new { month = from.ToString("MMMM yyyy"), byCategory, grandTotal = byCategory.Sum(x => x.total) });
    }

    [HttpPost]
    [Authorize(Roles = "Admin,SalonOwner,BranchManager,Cashier")]
    public async Task<ActionResult<object>> CreateExpense([FromBody] ExpenseRequest request, CancellationToken cancellationToken)
    {
        var number = $"EXP-{DateTime.UtcNow:yyyyMMddHHmmss}";
        var entity = new Expense
        {
            ExpenseNumber = number,
            TenantId = tenant.TenantId,
            BranchId = tenant.BranchId,
            Category = request.Category.Trim(),
            Description = request.Description.Trim(),
            Amount = request.Amount,
            ExpenseDate = request.ExpenseDate,
            PaymentMethod = request.PaymentMethod,
            Reference = request.Reference,
            RecordedByUserId = tenant.UserId == Guid.Empty ? null : tenant.UserId
        };
        db.Expenses.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Create", nameof(Expense), entity.Id.ToString(), request, cancellationToken);
        return Ok(entity);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,SalonOwner,BranchManager,Cashier")]
    public async Task<ActionResult<object>> UpdateExpense(Guid id, [FromBody] ExpenseRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.Expenses.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == tenant.BranchId, cancellationToken);
        if (entity is null) return NotFound();

        entity.Category = request.Category.Trim();
        entity.Description = request.Description.Trim();
        entity.Amount = request.Amount;
        entity.ExpenseDate = request.ExpenseDate;
        entity.PaymentMethod = request.PaymentMethod;
        entity.Reference = request.Reference;
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Update", nameof(Expense), entity.Id.ToString(), request, cancellationToken);
        return Ok(entity);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,SalonOwner,BranchManager")]
    public async Task<ActionResult> DeleteExpense(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.Expenses.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == tenant.BranchId, cancellationToken);
        if (entity is null) return NotFound();
        db.Expenses.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Delete", nameof(Expense), entity.Id.ToString(), null, cancellationToken);
        return NoContent();
    }
}
