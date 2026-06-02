using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickSalon.Api.Contracts;
using QuickSalon.Api.Domain;
using QuickSalon.Api.Infrastructure;

namespace QuickSalon.Api.Controllers;

public class RemindersController(SalonDbContext db, ICurrentTenant currentTenant, IAuditService audit, ILogger<RemindersController> logger) : BaseApiController(currentTenant)
{
    [HttpGet("pending")]
    public async Task<ActionResult<IEnumerable<object>>> GetPending(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        var tomorrow = today.AddDays(1);
        var now = DateTime.Now;

        var reminders = await (
            from appointment in db.Appointments.AsNoTracking()
            join customer in db.Customers.AsNoTracking() on appointment.CustomerId equals customer.Id
            join employee in db.Employees.AsNoTracking() on appointment.EmployeeId equals employee.Id
            join service in db.Services.AsNoTracking() on appointment.ServiceId equals service.Id into serviceJoin
            from service in serviceJoin.DefaultIfEmpty()
            where appointment.BranchId == BranchId
                && appointment.AppointmentDate >= today.AddDays(-1)
                && appointment.AppointmentDate <= tomorrow
                && appointment.Status != AppointmentStatus.Cancelled
                && appointment.Status != AppointmentStatus.Completed
                && appointment.Status != AppointmentStatus.NoShow
            orderby appointment.AppointmentDate, appointment.StartTime
            select new
            {
                appointment.Id,
                appointment.AppointmentNumber,
                appointment.CustomerId,
                appointment.EmployeeId,
                appointment.ServiceId,
                appointment.AppointmentDate,
                appointment.StartTime,
                appointment.EndTime,
                appointment.Status,
                CustomerName = customer.FirstName + " " + customer.LastName,
                EmployeeName = employee.Name,
                ServiceName = service != null ? service.Name : "General Service"
            }).ToListAsync(cancellationToken);

        var result = reminders
            .Select(item =>
            {
                var start = item.AppointmentDate.ToDateTime(item.StartTime);
                var end = item.AppointmentDate.ToDateTime(item.EndTime);

                string? section = null;
                string? type = null;
                string? label = null;
                DateTime? triggeredAt = null;

                if (item.Status == AppointmentStatus.InProgress && end < now)
                {
                    section = "NeedsAttention";
                    type = "Overrun";
                    label = "Running over";
                    triggeredAt = end;
                }
                else if ((item.Status == AppointmentStatus.Booked || item.Status == AppointmentStatus.Confirmed) && start <= now.AddMinutes(-15))
                {
                    section = "NeedsAttention";
                    type = "Forgotten";
                    label = "Not started";
                    triggeredAt = start;
                }
                else if (item.AppointmentDate == today && start > now)
                {
                    section = "TodayUpcoming";
                    type = "Upcoming";
                    label = $"Upcoming in {Math.Max(1, (int)Math.Ceiling((start - now).TotalHours))} hrs";
                    triggeredAt = start;
                }
                else if (item.AppointmentDate == tomorrow)
                {
                    section = "TomorrowUpcoming";
                    type = "Upcoming";
                    label = $"Upcoming in {Math.Max(1, (int)Math.Ceiling((start - now).TotalHours))} hrs";
                    triggeredAt = start;
                }

                return new
                {
                    item.Id,
                    item.AppointmentNumber,
                    item.CustomerId,
                    item.EmployeeId,
                    item.ServiceId,
                    item.AppointmentDate,
                    item.StartTime,
                    item.EndTime,
                    item.Status,
                    item.CustomerName,
                    item.EmployeeName,
                    item.ServiceName,
                    Section = section,
                    ReminderType = type,
                    ReminderLabel = label,
                    TriggeredAt = triggeredAt
                };
            })
            .Where(x => x.Section is not null)
            .ToList();

        return Ok(result);
    }

    [HttpPost("send")]
    public async Task<ActionResult<object>> Send([FromBody] ReminderSendRequest request, CancellationToken cancellationToken)
    {
        var appointmentExists = await db.Appointments.AnyAsync(x => x.Id == request.AppointmentId && x.BranchId == BranchId, cancellationToken);
        if (!appointmentExists)
        {
            return NotFound(new { message = "Appointment not found." });
        }

        logger.LogInformation("Reminder queued for appointment {AppointmentId} via {Channel}: {Message}", request.AppointmentId, request.Channel, request.Message);
        await audit.LogAsync("SendReminder", nameof(Appointment), request.AppointmentId.ToString(), request, cancellationToken);

        return Ok(new { queued = true });
    }
}