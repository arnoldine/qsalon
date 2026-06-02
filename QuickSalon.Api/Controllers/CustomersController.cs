using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickSalon.Api.Contracts;
using QuickSalon.Api.Domain;
using QuickSalon.Api.Infrastructure;

namespace QuickSalon.Api.Controllers;

public class CustomersController(SalonDbContext db, ICurrentTenant currentTenant, IAuditService audit) : BaseApiController(currentTenant)
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<Customer>>> Search([FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var query = db.Customers.AsNoTracking().Where(x => x.BranchId == BranchId);

        if (!string.IsNullOrWhiteSpace(q))
        {
            query = query.Where(x =>
                x.CustomerNumber.Contains(q) ||
                x.FirstName.Contains(q) ||
                x.LastName.Contains(q) ||
                x.Phone.Contains(q) ||
                (x.Email != null && x.Email.Contains(q)));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<Customer>(items, total));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Customer>> Get(Guid id, CancellationToken cancellationToken)
    {
        var customer = await db.Customers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        return customer is null ? NotFound() : Ok(customer);
    }

    [HttpPost]
    public async Task<ActionResult<Customer>> Create([FromBody] CustomerUpsertRequest request, CancellationToken cancellationToken)
    {
        var number = $"CUST-{DateTime.UtcNow:yyyyMMddHHmmss}";
        var entity = new Customer
        {
            TenantId = TenantId,
            BranchId = BranchId,
            CustomerNumber = number,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Gender = request.Gender,
            Phone = request.Phone,
            Email = request.Email,
            DateOfBirth = request.DateOfBirth,
            Notes = request.Notes,
            LoyaltyPoints = request.LoyaltyPoints
        };

        db.Customers.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Create", nameof(Customer), entity.Id.ToString(), entity, cancellationToken);

        return CreatedAtAction(nameof(Get), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Customer>> Update(Guid id, [FromBody] CustomerUpsertRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.Customers.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (entity is null)
        {
            return NotFound();
        }

        entity.FirstName = request.FirstName;
        entity.LastName = request.LastName;
        entity.Gender = request.Gender;
        entity.Phone = request.Phone;
        entity.Email = request.Email;
        entity.DateOfBirth = request.DateOfBirth;
        entity.Notes = request.Notes;
        entity.LoyaltyPoints = request.LoyaltyPoints;
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Update", nameof(Customer), entity.Id.ToString(), request, cancellationToken);

        return Ok(entity);
    }

    [HttpGet("{id:guid}/visit-history")]
    public async Task<ActionResult<object>> VisitHistory(Guid id, CancellationToken cancellationToken)
    {
        var history = await (
            from a in db.Appointments.AsNoTracking()
            join i in db.Invoices.AsNoTracking() on a.Id equals i.AppointmentId into invoiceJoin
            from i in invoiceJoin.DefaultIfEmpty()
            where a.CustomerId == id && a.BranchId == BranchId
            orderby a.AppointmentDate descending, a.StartTime descending
            select new
            {
                a.Id,
                a.AppointmentDate,
                a.StartTime,
                a.EndTime,
                a.Status,
                InvoiceNumber = i != null ? i.InvoiceNumber : null,
                InvoiceTotal = i != null ? i.TotalAmount : 0m
            }).ToListAsync(cancellationToken);

        return Ok(history);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (customer is null)
        {
            return NotFound();
        }

        db.Customers.Remove(customer);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Delete", nameof(Customer), customer.Id.ToString(), null, cancellationToken);

        return NoContent();
    }
}
