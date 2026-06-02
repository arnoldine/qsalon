using Microsoft.EntityFrameworkCore;
using QuickSalon.Api.Domain;

namespace QuickSalon.Api.Infrastructure;

public class SalonDbContext(DbContextOptions<SalonDbContext> options, ICurrentTenant currentTenant) : DbContext(options)
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<TenantSetting> TenantSettings => Set<TenantSetting>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<ServiceCategory> ServiceCategories => Set<ServiceCategory>();
    public DbSet<SalonService> Services => Set<SalonService>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<EmployeeSchedule> EmployeeSchedules => Set<EmployeeSchedule>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();
    public DbSet<Commission> Commissions => Set<Commission>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Tenant>().HasIndex(x => x.Slug).IsUnique();
        modelBuilder.Entity<TenantSetting>().HasIndex(x => x.TenantId).IsUnique();
        modelBuilder.Entity<TenantSetting>().OwnsOne(x => x.ReminderSettings, owned =>
        {
            if (Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
            {
                owned.ToJson();
            }
        });
        modelBuilder.Entity<AppUser>().HasIndex(x => new { x.TenantId, x.Username }).IsUnique();
        modelBuilder.Entity<Customer>().HasIndex(x => new { x.TenantId, x.BranchId, x.CustomerNumber }).IsUnique();
        modelBuilder.Entity<Appointment>().HasIndex(x => new { x.TenantId, x.BranchId, x.AppointmentNumber }).IsUnique();
        modelBuilder.Entity<Invoice>().HasIndex(x => new { x.TenantId, x.BranchId, x.InvoiceNumber }).IsUnique();
        modelBuilder.Entity<Product>().HasIndex(x => new { x.TenantId, x.BranchId, x.SKU }).IsUnique();

        ConfigureTenantScopedFilters(modelBuilder);
    }

    private void ConfigureTenantScopedFilters(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(TenantEntityBase).IsAssignableFrom(entityType.ClrType) && !entityType.ClrType.IsAbstract)
            {
                var method = typeof(SalonDbContext)
                    .GetMethod(nameof(SetTenantFilter), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                    ?.MakeGenericMethod(entityType.ClrType);

                method?.Invoke(this, [modelBuilder]);
            }
        }
    }

    private void SetTenantFilter<TEntity>(ModelBuilder modelBuilder) where TEntity : TenantEntityBase
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(x => currentTenant.TenantId == Guid.Empty || x.TenantId == currentTenant.TenantId);
    }
}
