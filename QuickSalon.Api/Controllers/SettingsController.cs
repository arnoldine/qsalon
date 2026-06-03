using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickSalon.Api.Contracts;
using QuickSalon.Api.Domain;
using QuickSalon.Api.Infrastructure;

namespace QuickSalon.Api.Controllers;

[Authorize]
public class SettingsController(SalonDbContext db, ICurrentTenant currentTenant, IAuditService audit) : BaseApiController(currentTenant)
{
    [HttpGet("tenant")]
    public async Task<ActionResult<TenantSetting>> GetTenantSettings(CancellationToken cancellationToken)
    {
        var settings = await db.TenantSettings.AsNoTracking().FirstOrDefaultAsync(x => x.TenantId == TenantId, cancellationToken);
        if (settings is null)
        {
            var tenant = await db.Tenants.AsNoTracking().FirstOrDefaultAsync(x => x.Id == TenantId, cancellationToken);
            return Ok(new TenantSetting
            {
                TenantId = TenantId,
                SalonName = tenant?.Name ?? "Salon",
                Email = tenant?.ContactEmail,
                Phone = tenant?.Phone,
                Address = tenant?.Address,
                OpeningHours = "08:00 - 20:00",
                DefaultCurrency = "GHS",
                TaxRate = 0m,
                ReceiptFooter = "Thank you for choosing us",
                EnableAppointmentReminders = false,
                ReminderSettings = new ReminderSettings()
            });
        }

        return Ok(settings);
    }

    [HttpPut("tenant")]
    [Authorize(Roles = "Admin,SalonOwner")]
    public async Task<ActionResult<TenantSetting>> UpsertTenantSettings([FromBody] TenantSettingRequest request, CancellationToken cancellationToken)
    {
        var settings = await db.TenantSettings.FirstOrDefaultAsync(x => x.TenantId == TenantId, cancellationToken);
        if (settings is null)
        {
            settings = new TenantSetting { TenantId = TenantId };
            db.TenantSettings.Add(settings);
        }

        settings.SalonName = request.SalonName;
        settings.LogoUrl = request.LogoUrl;
        settings.Phone = request.Phone;
        settings.Email = request.Email;
        settings.Address = request.Address;
        settings.OpeningHours = request.OpeningHours;
        settings.DefaultCurrency = string.IsNullOrWhiteSpace(request.DefaultCurrency) ? "GHS" : request.DefaultCurrency;
        settings.TaxRate = request.TaxRate;
        settings.ReceiptFooter = request.ReceiptFooter;
        settings.EnableAppointmentReminders = request.EnableAppointmentReminders;
        settings.ReminderSettings = request.ReminderSettings is null
            ? settings.ReminderSettings
            : new ReminderSettings
            {
                AutoReminderEnabled = request.ReminderSettings.AutoReminderEnabled,
                LeadTime = request.ReminderSettings.LeadTime,
                DefaultChannel = request.ReminderSettings.DefaultChannel,
                NumberPrefix = request.ReminderSettings.NumberPrefix,
                MessageTemplate = request.ReminderSettings.MessageTemplate
            };
        settings.UpdatedAt = DateTime.UtcNow;

        var tenant = await db.Tenants.FirstOrDefaultAsync(x => x.Id == TenantId, cancellationToken);
        if (tenant is not null)
        {
            if (!string.IsNullOrWhiteSpace(request.SalonName)) tenant.Name = request.SalonName;
            tenant.ContactEmail = request.Email;
            tenant.Phone = request.Phone;
            tenant.Address = request.Address;
            tenant.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Update", nameof(TenantSetting), settings.Id.ToString(), request, cancellationToken);

        return Ok(settings);
    }

    [HttpPatch]
    public async Task<ActionResult<TenantSetting>> PatchReminderSettings([FromBody] ReminderSettingsRequest request, CancellationToken cancellationToken)
    {
        var settings = await db.TenantSettings.FirstOrDefaultAsync(x => x.TenantId == TenantId, cancellationToken);
        if (settings is null)
        {
            settings = new TenantSetting { TenantId = TenantId };
            db.TenantSettings.Add(settings);
        }

        settings.EnableAppointmentReminders = request.AutoReminderEnabled;
        settings.ReminderSettings = new ReminderSettings
        {
            AutoReminderEnabled = request.AutoReminderEnabled,
            LeadTime = request.LeadTime,
            DefaultChannel = request.DefaultChannel,
            NumberPrefix = request.NumberPrefix,
            MessageTemplate = request.MessageTemplate
        };
        settings.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("PatchReminderSettings", nameof(TenantSetting), settings.Id.ToString(), request, cancellationToken);

        return Ok(settings);
    }
}
