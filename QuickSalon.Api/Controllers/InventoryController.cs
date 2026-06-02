using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickSalon.Api.Contracts;
using QuickSalon.Api.Domain;
using QuickSalon.Api.Infrastructure;

namespace QuickSalon.Api.Controllers;

public class SuppliersController(SalonDbContext db, ICurrentTenant currentTenant) : BaseApiController(currentTenant)
{
    [HttpGet("/api/suppliers")]
    public async Task<ActionResult<IEnumerable<Supplier>>> GetAll(CancellationToken cancellationToken)
        => Ok(await db.Suppliers.AsNoTracking().Where(x => x.BranchId == BranchId).OrderBy(x => x.Name).ToListAsync(cancellationToken));

    [HttpPost("/api/suppliers")]
    public async Task<ActionResult<Supplier>> Create([FromBody] SupplierRequest request, CancellationToken cancellationToken)
    {
        var entity = new Supplier
        {
            TenantId = TenantId,
            BranchId = BranchId,
            Name = request.Name,
            ContactPerson = request.ContactPerson,
            Phone = request.Phone
        };

        db.Suppliers.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(entity);
    }
}

public class ProductsController(SalonDbContext db, ICurrentTenant currentTenant, IAuditService audit) : BaseApiController(currentTenant)
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetAll(CancellationToken cancellationToken)
        => Ok(await db.Products.AsNoTracking().Where(x => x.BranchId == BranchId).OrderBy(x => x.Name).ToListAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<Product>> Create([FromBody] ProductRequest request, CancellationToken cancellationToken)
    {
        var entity = new Product
        {
            TenantId = TenantId,
            BranchId = BranchId,
            SKU = request.SKU,
            Name = request.Name,
            CostPrice = request.CostPrice,
            SellingPrice = request.SellingPrice,
            QuantityOnHand = request.QuantityOnHand,
            ReorderLevel = request.ReorderLevel,
            SupplierId = request.SupplierId,
            IsActive = request.IsActive
        };

        db.Products.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Create", nameof(Product), entity.Id.ToString(), entity, cancellationToken);
        return Ok(entity);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Product>> Update(Guid id, [FromBody] ProductRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.Products.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (entity is null) return NotFound();

        entity.SKU = request.SKU;
        entity.Name = request.Name;
        entity.CostPrice = request.CostPrice;
        entity.SellingPrice = request.SellingPrice;
        entity.QuantityOnHand = request.QuantityOnHand;
        entity.ReorderLevel = request.ReorderLevel;
        entity.SupplierId = request.SupplierId;
        entity.IsActive = request.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Update", nameof(Product), entity.Id.ToString(), request, cancellationToken);

        return Ok(entity);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.Products.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (entity is null) return NotFound();

        db.Products.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("transactions")]
    public async Task<ActionResult<InventoryTransaction>> RecordTransaction([FromBody] InventoryTransactionRequest request, CancellationToken cancellationToken)
    {
        var product = await db.Products.FirstOrDefaultAsync(x => x.Id == request.ProductId && x.BranchId == BranchId, cancellationToken);
        if (product is null)
        {
            return NotFound(new { message = "Product not found." });
        }

        var qtyDelta = request.Type switch
        {
            InventoryTransactionType.StockIn => request.Quantity,
            InventoryTransactionType.StockOut => -request.Quantity,
            InventoryTransactionType.Adjustment => request.Quantity,
            _ => 0
        };

        product.QuantityOnHand += qtyDelta;
        product.UpdatedAt = DateTime.UtcNow;

        var tx = new InventoryTransaction
        {
            TenantId = TenantId,
            BranchId = BranchId,
            ProductId = request.ProductId,
            Type = request.Type,
            Quantity = request.Quantity,
            Notes = request.Notes
        };

        db.InventoryTransactions.Add(tx);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("InventoryTransaction", nameof(Product), product.Id.ToString(), request, cancellationToken);

        return Ok(tx);
    }

    [HttpPost("/api/inventory/{id:guid}/transactions")]
    public Task<ActionResult<InventoryTransaction>> RecordProductTransaction(Guid id, [FromBody] InventoryTransactionRequest request, CancellationToken cancellationToken)
    {
        var normalizedRequest = request with { ProductId = id };
        return RecordTransaction(normalizedRequest, cancellationToken);
    }
}
