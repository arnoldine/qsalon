using QuickSalon.Api.Domain;

namespace QuickSalon.Api.Contracts;

public record PagedResult<T>(IReadOnlyCollection<T> Items, int TotalCount);

public record CustomerUpsertRequest(
    string FirstName,
    string LastName,
    string? Gender,
    string Phone,
    string? Email,
    DateOnly? DateOfBirth,
    string? Notes,
    int LoyaltyPoints);

public record ServiceCategoryRequest(string Name, bool IsActive);
public record ServiceRequest(string Name, Guid CategoryId, int DurationMinutes, decimal Price, bool IsActive);

public record EmployeeRequest(string Name, string Role, string? Phone, decimal CommissionRate, string Status);
public record EmployeeScheduleRequest(Guid EmployeeId, DayOfWeek DayOfWeek, TimeOnly StartTime, TimeOnly EndTime, bool IsOffDay);

public record AppointmentRequest(
    Guid CustomerId,
    Guid EmployeeId,
    Guid? ServiceId,
    DateOnly AppointmentDate,
    TimeOnly StartTime,
    TimeOnly EndTime,
    AppointmentStatus Status,
    string? Notes);

public record InvoiceCreateRequest(Guid? CustomerId, Guid? AppointmentId);
public record InvoiceItemRequest(InvoiceItemType ItemType, Guid ItemId, string Description, int Quantity, decimal UnitPrice, Guid? EmployeeId);
public record PaymentRequest(PaymentMethod Method, decimal Amount, string? Reference);

public record SupplierRequest(string Name, string? ContactPerson, string? Phone);
public record ProductRequest(string SKU, string Name, decimal CostPrice, decimal SellingPrice, int QuantityOnHand, int ReorderLevel, Guid? SupplierId, bool IsActive);
public record InventoryTransactionRequest(Guid ProductId, InventoryTransactionType Type, int Quantity, string? Notes);

public record TenantSettingRequest(
    string? SalonName,
    string? LogoUrl,
    string? Phone,
    string? Email,
    string? Address,
    string? OpeningHours,
    string DefaultCurrency,
    decimal TaxRate,
    string? ReceiptFooter,
    bool EnableAppointmentReminders,
    ReminderSettingsRequest? ReminderSettings);

public record ReminderSettingsRequest(
    bool AutoReminderEnabled,
    string LeadTime,
    string DefaultChannel,
    string? NumberPrefix,
    string MessageTemplate);

public record ReminderSendRequest(Guid AppointmentId, string Channel, string Message);

public record AuthProfileResponse(
    Guid UserId,
    string FullName,
    Guid TenantId,
    string TenantName,
    Guid BranchId,
    string BranchName,
    IReadOnlyCollection<string> Roles);

public record TenantAdminRequest(
    string Name,
    string Slug,
    string? ContactEmail,
    string? Phone,
    string? Address,
    bool IsActive);

public record BranchAdminRequest(
    Guid TenantId,
    string Name,
    string? Address,
    string? Phone);

public record UserAdminRequest(
    Guid TenantId,
    Guid BranchId,
    string FullName,
    string Username,
    string? Email,
    bool IsActive,
    string Role,
    string? Password);

public record StatusToggleRequest(bool IsActive);

public record TenantProvisionRequest(
    string Name,
    string Slug,
    string? ContactEmail,
    string? Phone,
    string? Address,
    string AdminUsername,
    string AdminFullName,
    string? AdminPassword);

public record TenantProvisionResponse(
    Guid TenantId,
    string TenantName,
    Guid BranchId,
    string AdminUsername,
    string TempPassword);

public record PurchaseRequest(
    Guid? SupplierId,
    string? SupplierName,
    DateOnly PurchaseDate,
    string? Notes);

public record PurchaseItemRequest(
    Guid ProductId,
    string Description,
    int Quantity,
    decimal UnitCost);

public record PurchaseStatusRequest(string Status);

public record ExpenseRequest(
    string Category,
    string Description,
    decimal Amount,
    DateOnly ExpenseDate,
    string PaymentMethod,
    string? Reference);

public record SuperAdminStatsResponse(
    int TotalTenants,
    int ActiveTenants,
    int TotalBranches,
    int TotalUsers);
