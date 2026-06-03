using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace QuickSalon.Api.Infrastructure;

public class TenantScopeFilter(ICurrentTenant currentTenant) : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        // SystemAdmin operates platform-wide — exempt from tenant scope check
        if (context.HttpContext.User.IsInRole("SystemAdmin"))
            return;

        if (currentTenant.TenantId == Guid.Empty || currentTenant.BranchId == Guid.Empty)
        {
            context.Result = new UnauthorizedObjectResult(new
            {
                message = "Tenant context is missing. Please sign in again."
            });
        }
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
    }
}
