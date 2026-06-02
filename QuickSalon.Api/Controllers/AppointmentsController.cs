using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickSalon.Api.Contracts;
using QuickSalon.Api.Domain;
using QuickSalon.Api.Infrastructure;

namespace QuickSalon.Api.Controllers;

public class AppointmentsController(SalonDbContext db, ICurrentTenant currentTenant, IAuditService audit) : BaseApiController(currentTenant)
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Appointment>>> Search([FromQuery] DateOnly? date, [FromQuery] Guid? employeeId, [FromQuery] string? q, CancellationToken cancellationToken)
    {
        var query = db.Appointments.AsNoTracking().Where(x => x.BranchId == BranchId);

        if (date.HasValue)
        {
            query = query.Where(x => x.AppointmentDate == date.Value);
        }

        if (employeeId.HasValue)
        {
            query = query.Where(x => x.EmployeeId == employeeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            query = query.Where(x => x.AppointmentNumber.Contains(q) || (x.Notes != null && x.Notes.Contains(q)));
        }

        var results = await query.OrderBy(x => x.AppointmentDate).ThenBy(x => x.StartTime).ToListAsync(cancellationToken);
        return Ok(results);
    }

    [HttpPost]
    public async Task<ActionResult<Appointment>> Create([FromBody] AppointmentRequest request, CancellationToken cancellationToken)
    {
        var validate = await ValidateEmployeeAvailability(request.EmployeeId, request.AppointmentDate, request.StartTime, request.EndTime, null, cancellationToken);
        if (!validate.isValid)
        {
            return BadRequest(new { message = validate.error });
        }

        var appointment = new Appointment
        {
            TenantId = TenantId,
            BranchId = BranchId,
            AppointmentNumber = $"APT-{DateTime.UtcNow:yyyyMMddHHmmss}",
            CustomerId = request.CustomerId,
            EmployeeId = request.EmployeeId,
            ServiceId = request.ServiceId,
            AppointmentDate = request.AppointmentDate,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            Status = request.Status,
            Notes = request.Notes
        };

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Create", nameof(Appointment), appointment.Id.ToString(), appointment, cancellationToken);

        return Ok(appointment);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Appointment>> Update(Guid id, [FromBody] AppointmentRequest request, CancellationToken cancellationToken)
    {
        var appointment = await db.Appointments.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (appointment is null)
        {
            return NotFound();
        }

        var validate = await ValidateEmployeeAvailability(request.EmployeeId, request.AppointmentDate, request.StartTime, request.EndTime, id, cancellationToken);
        if (!validate.isValid)
        {
            return BadRequest(new { message = validate.error });
        }

        appointment.CustomerId = request.CustomerId;
        appointment.EmployeeId = request.EmployeeId;
        appointment.ServiceId = request.ServiceId;
        appointment.AppointmentDate = request.AppointmentDate;
        appointment.StartTime = request.StartTime;
        appointment.EndTime = request.EndTime;
        appointment.Status = request.Status;
        appointment.Notes = request.Notes;
        appointment.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Update", nameof(Appointment), appointment.Id.ToString(), request, cancellationToken);

        return Ok(appointment);
    }

    [HttpPost("{id:guid}/status")]
    public async Task<ActionResult<Appointment>> UpdateStatus(Guid id, [FromQuery] AppointmentStatus status, CancellationToken cancellationToken)
    {
        var appointment = await db.Appointments.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (appointment is null)
        {
            return NotFound();
        }

        appointment.Status = status;
        appointment.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("StatusChange", nameof(Appointment), appointment.Id.ToString(), new { status }, cancellationToken);

        return Ok(appointment);
    }

    [HttpPost("{id:guid}/mark-arrived")]
    public Task<ActionResult<Appointment>> MarkArrived(Guid id, CancellationToken cancellationToken)
        => UpdateStatus(id, AppointmentStatus.Confirmed, cancellationToken);

    [HttpPost("{id:guid}/start-service")]
    public Task<ActionResult<Appointment>> StartService(Guid id, CancellationToken cancellationToken)
        => UpdateStatus(id, AppointmentStatus.InProgress, cancellationToken);

    [HttpPost("{id:guid}/complete")]
    public Task<ActionResult<Appointment>> Complete(Guid id, CancellationToken cancellationToken)
        => UpdateStatus(id, AppointmentStatus.Completed, cancellationToken);

    [HttpPost("{id:guid}/cancel")]
    public Task<ActionResult<Appointment>> Cancel(Guid id, CancellationToken cancellationToken)
        => UpdateStatus(id, AppointmentStatus.Cancelled, cancellationToken);

    [HttpPost("{id:guid}/no-show")]
    public Task<ActionResult<Appointment>> NoShow(Guid id, CancellationToken cancellationToken)
        => UpdateStatus(id, AppointmentStatus.NoShow, cancellationToken);

    [HttpPost("{id:guid}/create-invoice")]
    public async Task<ActionResult<object>> CreateInvoice(Guid id, CancellationToken cancellationToken)
    {
        var appointment = await db.Appointments.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (appointment is null)
        {
            return NotFound();
        }

        var existing = await db.Invoices.FirstOrDefaultAsync(x => x.AppointmentId == id && x.BranchId == BranchId, cancellationToken);
        if (existing is not null)
        {
            return Ok(existing);
        }

        var invoice = new Invoice
        {
            TenantId = TenantId,
            BranchId = BranchId,
            CustomerId = appointment.CustomerId,
            AppointmentId = appointment.Id,
            InvoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMddHHmmss}",
            Status = InvoiceStatus.Draft
        };

        db.Invoices.Add(invoice);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("CreateInvoice", nameof(Appointment), appointment.Id.ToString(), new { invoice.Id }, cancellationToken);

        return Ok(invoice);
    }

    [HttpPost("{id:guid}/rebook")]
    public async Task<ActionResult<Appointment>> Rebook(Guid id, [FromQuery] DateOnly date, [FromQuery] TimeOnly startTime, [FromQuery] TimeOnly endTime, CancellationToken cancellationToken)
    {
        var original = await db.Appointments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (original is null)
        {
            return NotFound();
        }

        var validate = await ValidateEmployeeAvailability(original.EmployeeId, date, startTime, endTime, null, cancellationToken);
        if (!validate.isValid)
        {
            return BadRequest(new { message = validate.error });
        }

        var appointment = new Appointment
        {
            TenantId = TenantId,
            BranchId = BranchId,
            AppointmentNumber = $"APT-{DateTime.UtcNow:yyyyMMddHHmmss}",
            CustomerId = original.CustomerId,
            EmployeeId = original.EmployeeId,
            AppointmentDate = date,
            StartTime = startTime,
            EndTime = endTime,
            Status = AppointmentStatus.Booked,
            Notes = $"Rebooked from {original.AppointmentNumber}"
        };

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Rebook", nameof(Appointment), appointment.Id.ToString(), new { sourceId = id }, cancellationToken);

        return Ok(appointment);
    }

    private async Task<(bool isValid, string? error)> ValidateEmployeeAvailability(
        Guid employeeId,
        DateOnly date,
        TimeOnly start,
        TimeOnly end,
        Guid? excludeId,
        CancellationToken cancellationToken)
    {
        var schedule = await db.EmployeeSchedules.AsNoTracking().FirstOrDefaultAsync(x =>
            x.BranchId == BranchId &&
            x.EmployeeId == employeeId &&
            x.DayOfWeek == date.DayOfWeek,
            cancellationToken);

        if (schedule is not null)
        {
            if (schedule.IsOffDay)
            {
                return (false, "Employee is not available on selected day.");
            }

            if (start < schedule.StartTime || end > schedule.EndTime)
            {
                return (false, "Appointment is outside employee schedule.");
            }
        }

        var overlaps = await db.Appointments.AnyAsync(x =>
            x.BranchId == BranchId &&
            x.EmployeeId == employeeId &&
            x.AppointmentDate == date &&
            x.Status != AppointmentStatus.Cancelled &&
            x.Status != AppointmentStatus.NoShow &&
            (!excludeId.HasValue || x.Id != excludeId.Value) &&
            start < x.EndTime &&
            end > x.StartTime,
            cancellationToken);

        return overlaps
            ? (false, "Employee already has an overlapping appointment.")
            : (true, null);
    }
}
