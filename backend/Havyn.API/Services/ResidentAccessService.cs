using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Havyn.Data;

namespace Havyn.Services;

public enum ResidentScopeKind
{
    None,
    Unrestricted,
    Safehouse,
    Caseload
}

public sealed class ResidentScope
{
    public ResidentScopeKind Kind { get; init; }
    public int? SafehouseId { get; init; }
    public string? SocialWorkerCode { get; init; }
}

public interface IResidentAccessService
{
    Task<ResidentScope> GetScopeAsync(ClaimsPrincipal principal);
    bool ScopeAllowsCaseAccess(ResidentScope scope);
    IQueryable<Resident> ApplyToResidents(IQueryable<Resident> query, ResidentScope scope);
    IQueryable<int> ResidentIdsInScope(HavynDbContext db, ResidentScope scope);
    Task<bool> CanAccessResidentAsync(HavynDbContext db, ResidentScope scope, int residentId);
    bool CanCreateResident(ResidentScope scope);
    (bool Ok, string? Error) ValidateNewResident(ResidentScope scope, Resident r);
    Task<(bool Ok, string? Error)> ValidateResidentUpdateAsync(
        HavynDbContext db,
        ResidentScope scope,
        Resident existing,
        Resident updated);
}

public sealed class ResidentAccessService : IResidentAccessService
{
    private readonly UserManager<ApplicationUser> _userManager;

    public ResidentAccessService(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task<ResidentScope> GetScopeAsync(ClaimsPrincipal principal)
    {
        var user = await _userManager.GetUserAsync(principal);
        if (user == null)
            return new ResidentScope { Kind = ResidentScopeKind.None };

        var roles = await _userManager.GetRolesAsync(user);
        if (roles.Contains("Admin"))
            return new ResidentScope { Kind = ResidentScopeKind.Unrestricted };

        if (roles.Contains("Manager"))
        {
            if (user.SafehouseId == null)
                return new ResidentScope { Kind = ResidentScopeKind.None };
            return new ResidentScope
            {
                Kind = ResidentScopeKind.Safehouse,
                SafehouseId = user.SafehouseId
            };
        }

        if (roles.Contains("SocialWorker"))
        {
            var code = user.SocialWorkerCode?.Trim();
            if (string.IsNullOrEmpty(code))
                return new ResidentScope { Kind = ResidentScopeKind.None };
            return new ResidentScope
            {
                Kind = ResidentScopeKind.Caseload,
                SocialWorkerCode = code
            };
        }

        return new ResidentScope { Kind = ResidentScopeKind.None };
    }

    public bool ScopeAllowsCaseAccess(ResidentScope scope) =>
        scope.Kind is ResidentScopeKind.Unrestricted
            or ResidentScopeKind.Safehouse
            or ResidentScopeKind.Caseload;

    public IQueryable<Resident> ApplyToResidents(IQueryable<Resident> query, ResidentScope scope) =>
        scope.Kind switch
        {
            ResidentScopeKind.Unrestricted => query,
            ResidentScopeKind.Safehouse when scope.SafehouseId.HasValue =>
                query.Where(r => r.SafehouseId == scope.SafehouseId.Value),
            ResidentScopeKind.Caseload when !string.IsNullOrEmpty(scope.SocialWorkerCode) =>
                query.Where(r => r.AssignedSocialWorker == scope.SocialWorkerCode),
            _ => query.Where(_ => false)
        };

    public IQueryable<int> ResidentIdsInScope(HavynDbContext db, ResidentScope scope) =>
        ApplyToResidents(db.Residents.AsQueryable(), scope).Select(r => r.ResidentId);

    public async Task<bool> CanAccessResidentAsync(HavynDbContext db, ResidentScope scope, int residentId)
    {
        if (scope.Kind == ResidentScopeKind.Unrestricted)
            return true;
        return await ApplyToResidents(db.Residents.AsQueryable(), scope)
            .AnyAsync(r => r.ResidentId == residentId);
    }

    public bool CanCreateResident(ResidentScope scope) =>
        scope.Kind is ResidentScopeKind.Unrestricted or ResidentScopeKind.Safehouse;

    public (bool Ok, string? Error) ValidateNewResident(ResidentScope scope, Resident r)
    {
        if (!CanCreateResident(scope))
            return (false, "Only administrators and managers can create residents.");
        if (scope.Kind == ResidentScopeKind.Safehouse && scope.SafehouseId.HasValue &&
            r.SafehouseId != scope.SafehouseId.Value)
            return (false, "New residents must belong to your safehouse.");
        return (true, null);
    }

    public async Task<(bool Ok, string? Error)> ValidateResidentUpdateAsync(
        HavynDbContext db,
        ResidentScope scope,
        Resident existing,
        Resident updated)
    {
        if (!await CanAccessResidentAsync(db, scope, existing.ResidentId))
            return (false, "Not authorized for this resident.");

        if (scope.Kind == ResidentScopeKind.Unrestricted)
            return (true, null);

        if (scope.Kind == ResidentScopeKind.Safehouse && scope.SafehouseId.HasValue)
        {
            if (updated.SafehouseId != scope.SafehouseId.Value)
                return (false, "Cannot assign residents outside your safehouse.");
        }

        if (scope.Kind == ResidentScopeKind.Caseload && !string.IsNullOrEmpty(scope.SocialWorkerCode))
        {
            if (updated.SafehouseId != existing.SafehouseId)
                return (false, "Cannot change safehouse.");
            var assign = updated.AssignedSocialWorker?.Trim();
            if (!string.Equals(assign, scope.SocialWorkerCode, StringComparison.Ordinal))
                return (false, "Cannot change assigned social worker.");
        }

        return (true, null);
    }
}
