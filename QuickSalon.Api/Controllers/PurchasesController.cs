using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickSalon.Api.Contracts;
using QuickSalon.Api.Domain;
using QuickSalon.Api.Infrastructure;

namespace QuickSalon.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/purchases")]
[ServiceFilter(typeof(TenantScopeFilter))]
public class PurchasesController(SalonDbContext db, ICurrentTenant tenant, IAuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetPurchases(
        [FromQuery] string? q,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken)
    {
        var query = db.Purchases.AsNoTracking()
            .Where(x => x.BranchId == tenant.BranchId);

        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(x => x.PurchaseNumber.Contains(q) || (x.SupplierName != null && x.SupplierName.Contains(q)));
        if (from.HasValue) query = query.Where(x => x.PurchaseDate >= from.Value);
        if (to.HasValue)   query = query.Where(x => x.PurchaseDate <= to.Value);

        var items = await query.OrderByDescending(x => x.PurchaseDate).ThenByDescending(x => x.CreatedAt)
            .Select(x => new {
                x.Id, x.PurchaseNumber, x.SupplierId, x.SupplierName,
                x.PurchaseDate, x.Status, x.TotalAmount, x.AmountPaid, x.Notes, x.CreatedAt
            }).ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> GetPurchase(Guid id, CancellationToken cancellationToken)
    {
        var purchase = await db.Purchases.AsNoTracking()
            .Where(x => x.Id == id && x.BranchId == tenant.BranchId)
            .Select(x => new {
                x.Id, x.PurchaseNumber, x.SupplierId, x.SupplierName,
                x.PurchaseDate, x.Status, x.TotalAmount, x.AmountPaid, x.Notes, x.CreatedAt
            }).FirstOrDefaultAsync(cancellationToken);

        if (purchase is null) return NotFound();

        var items = await db.PurchaseItems.AsNoTracking()
            .Where(x => x.PurchaseId == id)
            .ToListAsync(cancellationToken);

        return Ok(new { purchase, items });
    }

    [HttpPost]
    [Authorize(Roles = "Admin,SalonOwner,BranchManager,InventoryOfficer")]
    public async Task<ActionResult<object>> CreatePurchase([FromBody] PurchaseRequest request, CancellationToken cancellationToken)
    {
        var number = $"PO-{DateTime.UtcNow:yyyyMMddHHmmss}";
        string? supplierName = request.SupplierName;
        if (request.SupplierId.HasValue && string.IsNullOrWhiteSpace(supplierName))
        {
            var sup = await db.Suppliers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.SupplierId.Value, cancellationToken);
            supplierName = sup?.Name;
        }

        var entity = new Purchase
        {
            PurchaseNumber = number,
            TenantId = tenant.TenantId,
            BranchId = tenant.BranchId,
            SupplierId = request.SupplierId,
            SupplierName = supplierName,
            PurchaseDate = request.PurchaseDate,
            Notes = request.Notes,
            Status = PurchaseStatus.Draft,
            TotalAmount = 0,
            AmountPaid = 0
        };
        db.Purchases.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Create", nameof(Purchase), entity.Id.ToString(), request, cancellationToken);
        return Ok(new { entity.Id, entity.PurchaseNumber });
    }

    [HttpPost("{id:guid}/items")]
    [Authorize(Roles = "Admin,SalonOwner,BranchManager,InventoryOfficer")]
    public async Task<ActionResult<object>> AddItem(Guid id, [FromBody] PurchaseItemRequest request, CancellationToken cancellationToken)
    {
        var purchase = await db.Purchases.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == tenant.BranchId, cancellationToken);
        if (purchase is null) return NotFound();
        if (purchase.Status != PurchaseStatus.Draft)
            return BadRequest(new { message = "Cannot modify a non-draft purchase." });

        var item = new PurchaseItem
        {
            TenantId = tenant.TenantId,
            BranchId = tenant.BranchId,
            PurchaseId = id,
            ProductId = request.ProductId,
            Description = request.Description,
            Quantity = request.Quantity,
            UnitCost = request.UnitCost,
            LineTotal = request.Quantity * request.UnitCost
        };
        db.PurchaseItems.Add(item);

        purchase.TotalAmount = await db.PurchaseItems.Where(x => x.PurchaseId == id).SumAsync(x => x.LineTotal, cancellationToken) + item.LineTotal;
        purchase.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(item);
    }

    [HttpPost("{id:guid}/receive")]
    [Authorize(Roles = "Admin,SalonOwner,BranchManager,InventoryOfficer")]
    public async Task<ActionResult> ReceivePurchase(Guid id, CancellationToken cancellationToken)
    {
        var purchase = await db.Purchases.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == tenant.BranchId, cancellationToken);
        if (purchase is null) return NotFound();
        if (purchase.Status != PurchaseStatus.Draft)
            return BadRequest(new { message = "Purchase is not in Draft status." });

        var items = await db.PurchaseItems.Where(x => x.PurchaseId == id).ToListAsync(cancellationToken);

        // Stock in each product
        foreach (var item in items)
        {
            var product = await db.Products.FirstOrDefaultAsync(x => x.Id == item.ProductId, cancellationToken);
            if (product is not null)
            {
                product.QuantityOnHand += item.Quantity;
                product.CostPrice = item.UnitCost; // update cost price
                product.UpdatedAt = DateTime.UtcNow;
            }
            db.InventoryTransactions.Add(new InventoryTransaction
            {
                TenantId = tenant.TenantId,
                BranchId = tenant.BranchId,
                ProductId = item.ProductId,
                Type = InventoryTransactionType.StockIn,
                Quantity = item.Quantity,
                Notes = $"From purchase {purchase.PurchaseNumber}"
            });
        }

        purchase.Status = PurchaseStatus.Received;
        purchase.AmountPaid = purchase.TotalAmount;
        purchase.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Receive", nameof(Purchase), purchase.Id.ToString(), null, cancellationToken);
        return Ok(new { purchase.Id, purchase.Status });
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = "Admin,SalonOwner,BranchManager")]
    public async Task<ActionResult> CancelPurchase(Guid id, CancellationToken cancellationToken)
    {
        var purchase = await db.Purchases.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == tenant.BranchId, cancellationToken);
        if (purchase is null) return NotFound();
        if (purchase.Status == PurchaseStatus.Received)
            return BadRequest(new { message = "Cannot cancel a received purchase." });

        purchase.Status = PurchaseStatus.Cancelled;
        purchase.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Cancel", nameof(Purchase), purchase.Id.ToString(), null, cancellationToken);
        return Ok(new { purchase.Id, purchase.Status });
    }

    [HttpDelete("{id:guid}/items/{itemId:guid}")]
    [Authorize(Roles = "Admin,SalonOwner,BranchManager,InventoryOfficer")]
    public async Task<ActionResult> DeleteItem(Guid id, Guid itemId, CancellationToken cancellationToken)
    {
        var purchase = await db.Purchases.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == tenant.BranchId, cancellationToken);
        if (purchase is null || purchase.Status != PurchaseStatus.Draft) return BadRequest(new { message = "Cannot modify." });

        var item = await db.PurchaseItems.FirstOrDefaultAsync(x => x.Id == itemId && x.PurchaseId == id, cancellationToken);
        if (item is null) return NotFound();

        db.PurchaseItems.Remove(item);
        purchase.TotalAmount -= item.LineTotal;
        purchase.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
