using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuickSalon.Api.Domain;

public abstract class EntityBase
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public abstract class TenantEntityBase : EntityBase
{
    public Guid TenantId { get; set; }
}

public abstract class BranchTenantEntityBase : TenantEntityBase
{
    public Guid BranchId { get; set; }
}

public class Tenant : EntityBase
{
    [MaxLength(100)]
    public required string Name { get; set; }

    [MaxLength(100)]
    public required string Slug { get; set; }

    [MaxLength(200)]
    public string? ContactEmail { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(300)]
    public string? Address { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<Branch> Branches { get; set; } = new List<Branch>();
}

public class TenantSetting : TenantEntityBase
{
    [MaxLength(100)]
    public string? SalonName { get; set; }

    [MaxLength(250)]
    public string? LogoUrl { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(200)]
    public string? Email { get; set; }

    [MaxLength(300)]
    public string? Address { get; set; }

    [MaxLength(120)]
    public string? OpeningHours { get; set; }

    [MaxLength(8)]
    public string DefaultCurrency { get; set; } = "GHS";

    [Column(TypeName = "numeric(5,2)")]
    public decimal TaxRate { get; set; }

    [MaxLength(500)]
    public string? ReceiptFooter { get; set; }

    public bool EnableAppointmentReminders { get; set; } = false;

    public ReminderSettings ReminderSettings { get; set; } = new();
}

public class ReminderSettings
{
    public bool AutoReminderEnabled { get; set; }

    [MaxLength(20)]
    public string LeadTime { get; set; } = "2h";

    [MaxLength(20)]
    public string DefaultChannel { get; set; } = "SMS";

    [MaxLength(20)]
    public string? NumberPrefix { get; set; }

    [MaxLength(1000)]
    public string MessageTemplate { get; set; } = "Hi {customerName}, reminder: your {service} appointment is on {date} at {time} with {employeeName} at {salonName}. Reply STOP to opt out.";
}

public class Branch : TenantEntityBase
{
    [MaxLength(120)]
    public required string Name { get; set; }

    [MaxLength(250)]
    public string? Address { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }
}

public class Role : TenantEntityBase
{
    [MaxLength(100)]
    public required string Name { get; set; }

    [MaxLength(200)]
    public string? Description { get; set; }
}

public class Permission : EntityBase
{
    [MaxLength(120)]
    public required string Key { get; set; }

    [MaxLength(200)]
    public required string Name { get; set; }
}

public class UserRole : EntityBase
{
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
}

public class RolePermission : EntityBase
{
    public Guid RoleId { get; set; }
    public Guid PermissionId { get; set; }
}

public class AppUser : BranchTenantEntityBase
{
    [MaxLength(120)]
    public required string FullName { get; set; }

    [MaxLength(120)]
    public required string Username { get; set; }

    [MaxLength(200)]
    public required string PasswordHash { get; set; }

    [MaxLength(200)]
    public string? Email { get; set; }

    public bool IsActive { get; set; } = true;
}

public class Customer : BranchTenantEntityBase
{
    [MaxLength(32)]
    public required string CustomerNumber { get; set; }

    [MaxLength(100)]
    public required string FirstName { get; set; }

    [MaxLength(100)]
    public required string LastName { get; set; }

    [MaxLength(20)]
    public string? Gender { get; set; }

    [MaxLength(20)]
    public required string Phone { get; set; }

    [MaxLength(200)]
    public string? Email { get; set; }

    public DateOnly? DateOfBirth { get; set; }
    public string? Notes { get; set; }
    public int LoyaltyPoints { get; set; }
}

public class ServiceCategory : BranchTenantEntityBase
{
    [MaxLength(120)]
    public required string Name { get; set; }
    public bool IsActive { get; set; } = true;
}

public class SalonService : BranchTenantEntityBase
{
    [MaxLength(150)]
    public required string Name { get; set; }

    public Guid CategoryId { get; set; }

    public int DurationMinutes { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal Price { get; set; }

    public bool IsActive { get; set; } = true;
}

public class Employee : BranchTenantEntityBase
{
    [MaxLength(150)]
    public required string Name { get; set; }

    [MaxLength(80)]
    public required string Role { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    [Column(TypeName = "numeric(5,2)")]
    public decimal CommissionRate { get; set; }

    [MaxLength(40)]
    public required string Status { get; set; } = "Active";
}

public class EmployeeSchedule : BranchTenantEntityBase
{
    public Guid EmployeeId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public bool IsOffDay { get; set; }
}

public enum AppointmentStatus
{
    Booked,
    Confirmed,
    InProgress,
    Completed,
    Cancelled,
    NoShow
}

public class Appointment : BranchTenantEntityBase
{
    [MaxLength(32)]
    public required string AppointmentNumber { get; set; }

    public Guid CustomerId { get; set; }
    public Guid EmployeeId { get; set; }
    public Guid? ServiceId { get; set; }
    public DateOnly AppointmentDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Booked;
    public string? Notes { get; set; }
}

public enum InvoiceStatus
{
    Draft,
    Completed,
    Voided
}

public enum InvoiceItemType
{
    Service,
    Product
}

public enum PaymentMethod
{
    Cash,
    Card,
    MobileMoney
}

public class Invoice : BranchTenantEntityBase
{
    [MaxLength(32)]
    public required string InvoiceNumber { get; set; }

    public Guid? CustomerId { get; set; }
    public Guid? AppointmentId { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;

    [Column(TypeName = "numeric(12,2)")]
    public decimal Subtotal { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal TotalAmount { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal AmountPaid { get; set; }
}

public class InvoiceItem : BranchTenantEntityBase
{
    public Guid InvoiceId { get; set; }
    public InvoiceItemType ItemType { get; set; }
    public Guid ItemId { get; set; }

    [MaxLength(150)]
    public required string Description { get; set; }

    public int Quantity { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal UnitPrice { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal LineTotal { get; set; }

    public Guid? EmployeeId { get; set; }
}

public class Payment : BranchTenantEntityBase
{
    public Guid InvoiceId { get; set; }
    public PaymentMethod Method { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal Amount { get; set; }

    [MaxLength(120)]
    public string? Reference { get; set; }
}

public class Supplier : BranchTenantEntityBase
{
    [MaxLength(150)]
    public required string Name { get; set; }

    [MaxLength(200)]
    public string? ContactPerson { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }
}

public class Product : BranchTenantEntityBase
{
    [MaxLength(50)]
    public required string SKU { get; set; }

    [MaxLength(150)]
    public required string Name { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal CostPrice { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal SellingPrice { get; set; }

    public int QuantityOnHand { get; set; }
    public int ReorderLevel { get; set; }

    public Guid? SupplierId { get; set; }
    public bool IsActive { get; set; } = true;
}

public enum InventoryTransactionType
{
    StockIn,
    StockOut,
    Adjustment
}

public class InventoryTransaction : BranchTenantEntityBase
{
    public Guid ProductId { get; set; }
    public InventoryTransactionType Type { get; set; }
    public int Quantity { get; set; }
    public string? Notes { get; set; }
}

public class Commission : BranchTenantEntityBase
{
    public Guid EmployeeId { get; set; }
    public Guid InvoiceId { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal ServiceAmount { get; set; }

    [Column(TypeName = "numeric(5,2)")]
    public decimal CommissionRate { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal CommissionAmount { get; set; }
}

public enum PurchaseStatus { Draft, Received, Cancelled }

public class Purchase : BranchTenantEntityBase
{
    [MaxLength(32)]
    public required string PurchaseNumber { get; set; }

    public Guid? SupplierId { get; set; }

    [MaxLength(150)]
    public string? SupplierName { get; set; }

    public DateOnly PurchaseDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    public PurchaseStatus Status { get; set; } = PurchaseStatus.Draft;

    [Column(TypeName = "numeric(12,2)")]
    public decimal TotalAmount { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal AmountPaid { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}

public class PurchaseItem : BranchTenantEntityBase
{
    public Guid PurchaseId { get; set; }
    public Guid ProductId { get; set; }

    [MaxLength(150)]
    public required string Description { get; set; }

    public int Quantity { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal UnitCost { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal LineTotal { get; set; }
}

public class Expense : BranchTenantEntityBase
{
    [MaxLength(32)]
    public required string ExpenseNumber { get; set; }

    [MaxLength(100)]
    public required string Category { get; set; }

    [MaxLength(250)]
    public required string Description { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal Amount { get; set; }

    public DateOnly ExpenseDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    [MaxLength(40)]
    public string PaymentMethod { get; set; } = "Cash";

    [MaxLength(200)]
    public string? Reference { get; set; }

    public Guid? RecordedByUserId { get; set; }
}

public class AuditLog : TenantEntityBase
{
    public Guid? UserId { get; set; }

    [MaxLength(40)]
    public required string Action { get; set; }

    [MaxLength(80)]
    public required string EntityName { get; set; }

    [MaxLength(80)]
    public required string EntityId { get; set; }

    public string? ChangesJson { get; set; }
}
