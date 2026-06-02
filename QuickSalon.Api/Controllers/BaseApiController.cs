using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuickSalon.Api.Infrastructure;

namespace QuickSalon.Api.Controllers;

[ApiController]
[Authorize]
[ServiceFilter(typeof(TenantScopeFilter))]
[Route("api/[controller]")]
public abstract class BaseApiController(ICurrentTenant currentTenant) : ControllerBase
{
    protected Guid TenantId => currentTenant.TenantId;
    protected Guid BranchId => currentTenant.BranchId;
}
