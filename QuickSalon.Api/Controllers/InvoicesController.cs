using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickSalon.Api.Contracts;
using QuickSalon.Api.Domain;
using QuickSalon.Api.Infrastructure;

namespace QuickSalon.Api.Controllers;

public class InvoicesController(SalonDbContext db, ICurrentTenant currentTenant, IAuditService audit) : BaseApiController(currentTenant)
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Invoice>>> GetAll(CancellationToken cancellationToken)
        => Ok(await db.Invoices.AsNoTracking().Where(x => x.BranchId == BranchId).OrderByDescending(x => x.CreatedAt).ToListAsync(cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> Get(Guid id, CancellationToken cancellationToken)
    {
        var invoice = await db.Invoices.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (invoice is null)
        {
            return NotFound();
        }

        var items = await db.InvoiceItems.AsNoTracking().Where(x => x.InvoiceId == id && x.BranchId == BranchId).ToListAsync(cancellationToken);
        var payments = await db.Payments.AsNoTracking().Where(x => x.InvoiceId == id && x.BranchId == BranchId).ToListAsync(cancellationToken);

        return Ok(new { invoice, items, payments });
    }

    [HttpPost]
    public async Task<ActionResult<Invoice>> Create([FromBody] InvoiceCreateRequest request, CancellationToken cancellationToken)
    {
        var invoice = new Invoice
        {
            TenantId = TenantId,
            BranchId = BranchId,
            CustomerId = request.CustomerId,
            AppointmentId = request.AppointmentId,
            InvoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMddHHmmss}",
            Status = InvoiceStatus.Draft
        };

        db.Invoices.Add(invoice);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Create", nameof(Invoice), invoice.Id.ToString(), invoice, cancellationToken);

        return Ok(invoice);
    }

    [HttpPost("{id:guid}/items")]
    public async Task<ActionResult<Invoice>> AddItem(Guid id, [FromBody] InvoiceItemRequest request, CancellationToken cancellationToken)
    {
        var invoice = await db.Invoices.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (invoice is null || invoice.Status == InvoiceStatus.Voided)
        {
            return BadRequest(new { message = "Invoice is not editable." });
        }

        var item = new InvoiceItem
        {
            TenantId = TenantId,
            BranchId = BranchId,
            InvoiceId = id,
            ItemType = request.ItemType,
            ItemId = request.ItemId,
            Description = request.Description,
            Quantity = request.Quantity,
            UnitPrice = request.UnitPrice,
            LineTotal = request.Quantity * request.UnitPrice,
            EmployeeId = request.EmployeeId
        };

        db.InvoiceItems.Add(item);
        await db.SaveChangesAsync(cancellationToken);

        await RecalculateInvoiceAsync(invoice, cancellationToken);
        return Ok(invoice);
    }

    [HttpPost("{id:guid}/payments")]
    public async Task<ActionResult<object>> ReceivePayment(Guid id, [FromBody] PaymentRequest request, CancellationToken cancellationToken)
    {
        var invoice = await db.Invoices.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (invoice is null || invoice.Status == InvoiceStatus.Voided)
        {
            return BadRequest(new { message = "Invoice not found or voided." });
        }

        var payment = new Payment
        {
            TenantId = TenantId,
            BranchId = BranchId,
            InvoiceId = id,
            Method = request.Method,
            Amount = request.Amount,
            Reference = request.Reference
        };

        db.Payments.Add(payment);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Payment", nameof(Invoice), invoice.Id.ToString(), request, cancellationToken);

        await RecalculateInvoiceAsync(invoice, cancellationToken);

        var wasCompleted = invoice.Status == InvoiceStatus.Completed;
        if (!wasCompleted && invoice.AmountPaid >= invoice.TotalAmount && invoice.TotalAmount > 0)
        {
            invoice.Status = InvoiceStatus.Completed;
            await GenerateCommissionsAsync(invoice, cancellationToken);
            await ReduceInventoryAsync(invoice, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
            await audit.LogAsync("Complete", nameof(Invoice), invoice.Id.ToString(), new { invoice.TotalAmount }, cancellationToken);
        }

        return Ok(new { invoice, payment });
    }

    [HttpPost("{id:guid}/void")]
    public async Task<ActionResult<Invoice>> Void(Guid id, CancellationToken cancellationToken)
    {
        var invoice = await db.Invoices.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (invoice is null)
        {
            return NotFound();
        }

        invoice.Status = InvoiceStatus.Voided;
        invoice.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Void", nameof(Invoice), invoice.Id.ToString(), null, cancellationToken);

        return Ok(invoice);
    }

    private async Task RecalculateInvoiceAsync(Invoice invoice, CancellationToken cancellationToken)
    {
        var items = await db.InvoiceItems.Where(x => x.InvoiceId == invoice.Id && x.BranchId == BranchId).ToListAsync(cancellationToken);
        var payments = await db.Payments.Where(x => x.InvoiceId == invoice.Id && x.BranchId == BranchId).ToListAsync(cancellationToken);

        invoice.Subtotal = items.Sum(x => x.LineTotal);
        invoice.TotalAmount = invoice.Subtotal;
        invoice.AmountPaid = payments.Sum(x => x.Amount);
        invoice.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task ReduceInventoryAsync(Invoice invoice, CancellationToken cancellationToken)
    {
        var marker = $"Invoice:{invoice.Id}";
        var alreadyReduced = await db.InventoryTransactions.AnyAsync(x =>
            x.BranchId == BranchId &&
            x.Type == InventoryTransactionType.StockOut &&
            x.Notes != null &&
            x.Notes.Contains(marker), cancellationToken);

        if (alreadyReduced)
        {
            return;
        }

        var items = await db.InvoiceItems
            .Where(x => x.InvoiceId == invoice.Id && x.BranchId == BranchId && x.ItemType == InvoiceItemType.Product)
            .ToListAsync(cancellationToken);

        foreach (var item in items)
        {
            var product = await db.Products.FirstOrDefaultAsync(x => x.Id == item.ItemId && x.BranchId == BranchId, cancellationToken);
            if (product is null)
            {
                continue;
            }

            product.QuantityOnHand = Math.Max(0, product.QuantityOnHand - item.Quantity);
            product.UpdatedAt = DateTime.UtcNow;

            db.InventoryTransactions.Add(new InventoryTransaction
            {
                TenantId = TenantId,
                BranchId = BranchId,
                ProductId = product.Id,
                Type = InventoryTransactionType.StockOut,
                Quantity = item.Quantity,
                Notes = marker
            });
        }
    }

    private async Task GenerateCommissionsAsync(Invoice invoice, CancellationToken cancellationToken)
    {
        var existing = await db.Commissions.AnyAsync(x => x.InvoiceId == invoice.Id && x.BranchId == BranchId, cancellationToken);
        if (existing)
        {
            return;
        }

        var items = await db.InvoiceItems.Where(x => x.InvoiceId == invoice.Id && x.ItemType == InvoiceItemType.Service && x.EmployeeId != null).ToListAsync(cancellationToken);
        var employeeIds = items.Where(x => x.EmployeeId.HasValue).Select(x => x.EmployeeId!.Value).Distinct().ToList();
        var employees = await db.Employees.Where(x => employeeIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, cancellationToken);

        foreach (var item in items)
        {
            var employeeId = item.EmployeeId!.Value;
            if (!employees.TryGetValue(employeeId, out var employee))
            {
                continue;
            }

            var amount = item.LineTotal;
            var commissionAmount = Math.Round(amount * (employee.CommissionRate / 100m), 2);

            db.Commissions.Add(new Commission
            {
                TenantId = TenantId,
                BranchId = BranchId,
                EmployeeId = employeeId,
                InvoiceId = invoice.Id,
                ServiceAmount = amount,
                CommissionRate = employee.CommissionRate,
                CommissionAmount = commissionAmount
            });
        }
    }
}
