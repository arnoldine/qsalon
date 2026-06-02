using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickSalon.Api.Contracts;
using QuickSalon.Api.Domain;
using QuickSalon.Api.Infrastructure;

namespace QuickSalon.Api.Controllers;

public class EmployeesController(SalonDbContext db, ICurrentTenant currentTenant, IAuditService audit) : BaseApiController(currentTenant)
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Employee>>> GetAll(CancellationToken cancellationToken)
        => Ok(await db.Employees.AsNoTracking().Where(x => x.BranchId == BranchId).OrderBy(x => x.Name).ToListAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<Employee>> Create([FromBody] EmployeeRequest request, CancellationToken cancellationToken)
    {
        var entity = new Employee
        {
            TenantId = TenantId,
            BranchId = BranchId,
            Name = request.Name,
            Role = request.Role,
            Phone = request.Phone,
            CommissionRate = request.CommissionRate,
            Status = request.Status
        };

        db.Employees.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Create", nameof(Employee), entity.Id.ToString(), request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = entity.Id }, entity);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Employee>> Get(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Employee>> Update(Guid id, [FromBody] EmployeeRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.Employees.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (entity is null) return NotFound();

        entity.Name = request.Name;
        entity.Role = request.Role;
        entity.Phone = request.Phone;
        entity.CommissionRate = request.CommissionRate;
        entity.Status = request.Status;
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Update", nameof(Employee), entity.Id.ToString(), request, cancellationToken);
        return Ok(entity);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.Employees.FirstOrDefaultAsync(x => x.Id == id && x.BranchId == BranchId, cancellationToken);
        if (entity is null) return NotFound();
        db.Employees.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Delete", nameof(Employee), id.ToString(), null, cancellationToken);
        return NoContent();
    }

    [HttpGet("schedules")]
    public async Task<ActionResult<IEnumerable<EmployeeSchedule>>> GetSchedules(CancellationToken cancellationToken)
        => Ok(await db.EmployeeSchedules.AsNoTracking().Where(x => x.BranchId == BranchId).OrderBy(x => x.EmployeeId).ThenBy(x => x.DayOfWeek).ToListAsync(cancellationToken));

    [HttpPost("schedules")]
    public async Task<ActionResult<EmployeeSchedule>> UpsertSchedule([FromBody] EmployeeScheduleRequest request, CancellationToken cancellationToken)
    {
        var schedule = await db.EmployeeSchedules.FirstOrDefaultAsync(x =>
            x.BranchId == BranchId &&
            x.EmployeeId == request.EmployeeId &&
            x.DayOfWeek == request.DayOfWeek, cancellationToken);

        if (schedule is null)
        {
            schedule = new EmployeeSchedule
            {
                TenantId = TenantId,
                BranchId = BranchId,
                EmployeeId = request.EmployeeId,
                DayOfWeek = request.DayOfWeek,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                IsOffDay = request.IsOffDay
            };
            db.EmployeeSchedules.Add(schedule);
        }
        else
        {
            schedule.StartTime = request.StartTime;
            schedule.EndTime = request.EndTime;
            schedule.IsOffDay = request.IsOffDay;
            schedule.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync("Schedule", nameof(EmployeeSchedule), schedule.Id.ToString(), request, cancellationToken);
        return Ok(schedule);
    }
}
