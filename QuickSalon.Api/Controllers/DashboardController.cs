using ClosedXML.Excel;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickSalon.Api.Domain;
using QuickSalon.Api.Infrastructure;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Text;

namespace QuickSalon.Api.Controllers;

public class DashboardController(SalonDbContext db, ICurrentTenant currentTenant) : BaseApiController(currentTenant)
{
    [HttpGet("/api/dashboard/kpis")]
    public async Task<ActionResult<object>> GetKpis(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var todaysAppointments = await db.Appointments.CountAsync(x => x.BranchId == BranchId && x.AppointmentDate == today, cancellationToken);
        var todaysRevenue = await db.Invoices.Where(x => x.BranchId == BranchId && x.Status == InvoiceStatus.Completed && DateOnly.FromDateTime(x.CreatedAt) == today).SumAsync(x => (decimal?)x.TotalAmount, cancellationToken) ?? 0m;
        var pendingPayments = await db.Invoices.Where(x => x.BranchId == BranchId && x.Status != InvoiceStatus.Voided).SumAsync(x => (decimal?)(x.TotalAmount - x.AmountPaid), cancellationToken) ?? 0m;
        var activeCustomers = await db.Customers.CountAsync(x => x.BranchId == BranchId, cancellationToken);
        var staffOnDuty = await db.Employees.CountAsync(x => x.BranchId == BranchId && x.Status == "Active", cancellationToken);

        var topServices = await (from ii in db.InvoiceItems
                                 where ii.BranchId == BranchId && ii.ItemType == InvoiceItemType.Service
                                 group ii by ii.Description into g
                                 orderby g.Sum(x => x.LineTotal) descending
                                 select new { Service = g.Key, Revenue = g.Sum(x => x.LineTotal), Count = g.Sum(x => x.Quantity) })
                                 .Take(5)
                                 .ToListAsync(cancellationToken);

        var employeeCommissions = await db.Commissions
            .Where(c => c.BranchId == BranchId)
            .GroupBy(c => c.EmployeeId)
            .Select(g => new
            {
                EmployeeId = g.Key,
                Commission = g.Sum(x => x.CommissionAmount)
            })
            .OrderByDescending(x => x.Commission)
            .Take(5)
            .ToListAsync(cancellationToken);

        var employeeIds = employeeCommissions.Select(x => x.EmployeeId).ToList();
        var employeeNameMap = await db.Employees
            .Where(e => employeeIds.Contains(e.Id))
            .Select(e => new { e.Id, e.Name })
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);

        var topEmployees = employeeCommissions
            .Select(x => new
            {
                Name = employeeNameMap.TryGetValue(x.EmployeeId, out var name) ? name : "Unknown",
                x.Commission
            })
            .ToList();

        var lowStock = await db.Products.AsNoTracking().Where(x => x.BranchId == BranchId && x.QuantityOnHand <= x.ReorderLevel).OrderBy(x => x.QuantityOnHand).Take(10).ToListAsync(cancellationToken);

        return Ok(new
        {
            todaysAppointments,
            todaysRevenue,
            pendingPayments,
            activeCustomers,
            staffOnDuty,
            topServices,
            topEmployees,
            lowStock
        });
    }
}

public class ReportsController(SalonDbContext db, ICurrentTenant currentTenant) : BaseApiController(currentTenant)
{
    [HttpGet("/api/reports/{reportType}")]
    public async Task<ActionResult> GetReport(string reportType, [FromQuery] string format = "csv", CancellationToken cancellationToken = default)
    {
        var data = await BuildReportRows(reportType, cancellationToken);
        if (data.Count == 0)
        {
            return NotFound(new { message = "No report data found." });
        }

        var normalizedFormat = format.ToLowerInvariant();

        return normalizedFormat switch
        {
            "csv" => File(BuildCsv(data), "text/csv", $"{reportType}.csv"),
            "xlsx" => File(BuildXlsx(data), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{reportType}.xlsx"),
            "pdf" => File(BuildPdf(reportType, data), "application/pdf", $"{reportType}.pdf"),
            _ => BadRequest(new { message = "Unsupported format. Use csv, xlsx, or pdf." })
        };
    }

    [HttpGet("/api/commissions")]
    public async Task<ActionResult<IEnumerable<object>>> GetCommissions([FromQuery] string period = "daily", CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var fromDate = period.ToLowerInvariant() switch
        {
            "weekly" => now.AddDays(-7),
            "monthly" => now.AddMonths(-1),
            _ => now.Date
        };

        var results = await (from c in db.Commissions
                             where c.BranchId == BranchId && c.CreatedAt >= fromDate
                             join e in db.Employees on c.EmployeeId equals e.Id
                             group c by e.Name into g
                             select new
                             {
                                 Employee = g.Key,
                                 ServiceAmount = g.Sum(x => x.ServiceAmount),
                                 CommissionAmount = g.Sum(x => x.CommissionAmount)
                             }).ToListAsync(cancellationToken);

        return Ok(results);
    }

    private async Task<List<Dictionary<string, object>>> BuildReportRows(string reportType, CancellationToken cancellationToken)
    {
        switch (reportType.ToLowerInvariant())
        {
            case "sales":
            {
                var rows = await db.Invoices.AsNoTracking().Where(x => x.BranchId == BranchId).ToListAsync(cancellationToken);
                return rows.Select(x => new Dictionary<string, object>
                {
                    ["InvoiceNumber"] = x.InvoiceNumber,
                    ["Status"] = x.Status.ToString(),
                    ["TotalAmount"] = x.TotalAmount,
                    ["AmountPaid"] = x.AmountPaid,
                    ["CreatedAt"] = x.CreatedAt
                }).ToList();
            }

            case "appointments":
            {
                var rows = await db.Appointments.AsNoTracking().Where(x => x.BranchId == BranchId).ToListAsync(cancellationToken);
                return rows.Select(x => new Dictionary<string, object>
                {
                    ["AppointmentNumber"] = x.AppointmentNumber,
                    ["Date"] = x.AppointmentDate.ToString(),
                    ["Start"] = x.StartTime.ToString(),
                    ["End"] = x.EndTime.ToString(),
                    ["Status"] = x.Status.ToString()
                }).ToList();
            }

            case "customers":
            {
                var rows = await db.Customers.AsNoTracking().Where(x => x.BranchId == BranchId).ToListAsync(cancellationToken);
                return rows.Select(x => new Dictionary<string, object>
                {
                    ["CustomerNumber"] = x.CustomerNumber,
                    ["Name"] = x.FirstName + " " + x.LastName,
                    ["Phone"] = x.Phone,
                    ["Email"] = x.Email ?? string.Empty,
                    ["LoyaltyPoints"] = x.LoyaltyPoints
                }).ToList();
            }

            case "commissions":
            {
                var rows = await db.Commissions.AsNoTracking().Where(x => x.BranchId == BranchId).ToListAsync(cancellationToken);
                return rows.Select(x => new Dictionary<string, object>
                {
                    ["EmployeeId"] = x.EmployeeId,
                    ["InvoiceId"] = x.InvoiceId,
                    ["ServiceAmount"] = x.ServiceAmount,
                    ["CommissionRate"] = x.CommissionRate,
                    ["CommissionAmount"] = x.CommissionAmount
                }).ToList();
            }

            case "inventory":
            {
                var rows = await db.Products.AsNoTracking().Where(x => x.BranchId == BranchId).ToListAsync(cancellationToken);
                return rows.Select(x => new Dictionary<string, object>
                {
                    ["SKU"] = x.SKU,
                    ["Name"] = x.Name,
                    ["CostPrice"] = x.CostPrice,
                    ["SellingPrice"] = x.SellingPrice,
                    ["QuantityOnHand"] = x.QuantityOnHand,
                    ["ReorderLevel"] = x.ReorderLevel
                }).ToList();
            }

            default:
                return [];
        }
    }

    private static byte[] BuildCsv(List<Dictionary<string, object>> rows)
    {
        var headers = rows[0].Keys.ToList();
        var sb = new StringBuilder();
        sb.AppendLine(string.Join(',', headers));

        foreach (var row in rows)
        {
            sb.AppendLine(string.Join(',', headers.Select(h => EscapeCsv(row[h]?.ToString() ?? string.Empty))));
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static byte[] BuildXlsx(List<Dictionary<string, object>> rows)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.AddWorksheet("Report");
        var headers = rows[0].Keys.ToList();

        for (var i = 0; i < headers.Count; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
            ws.Cell(1, i + 1).Style.Font.Bold = true;
        }

        for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
        {
            for (var col = 0; col < headers.Count; col++)
            {
                ws.Cell(rowIndex + 2, col + 1).Value = rows[rowIndex][headers[col]]?.ToString() ?? string.Empty;
            }
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static byte[] BuildPdf(string title, List<Dictionary<string, object>> rows)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var headers = rows[0].Keys.ToList();

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(20);
                page.Header().Text($"{title.ToUpperInvariant()} REPORT").FontSize(16).Bold();
                page.Content().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        for (var i = 0; i < headers.Count; i++)
                        {
                            columns.RelativeColumn();
                        }
                    });

                    table.Header(header =>
                    {
                        foreach (var h in headers)
                        {
                            header.Cell().Element(CellStyle).Text(h).Bold();
                        }
                    });

                    foreach (var row in rows)
                    {
                        foreach (var h in headers)
                        {
                            table.Cell().Element(CellStyle).Text(row[h]?.ToString() ?? string.Empty);
                        }
                    }
                });
            });
        });

        return document.GeneratePdf();
    }

    private static IContainer CellStyle(IContainer container)
    {
        return container.BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(4).PaddingHorizontal(2);
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }
}
