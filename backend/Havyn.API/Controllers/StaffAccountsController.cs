using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Havyn.Data;
using Havyn.Dtos;

namespace Havyn.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "StaffAccountManagement")]
public class StaffAccountsController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly HavynDbContext _db;

    public StaffAccountsController(UserManager<ApplicationUser> userManager, HavynDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    /// <summary>List accounts. Uses <see cref="HavynDbContext"/> for queries so role filters compose in one SQL query.</summary>
    [HttpGet("")]
    public async Task<IActionResult> List(
        [FromQuery] int pageSize = 25,
        [FromQuery] int pageIndex = 1,
        [FromQuery] string? role = null)
    {
        var caller = await _userManager.GetUserAsync(User);
        if (caller == null)
            return Unauthorized();

        var callerRoles = await _userManager.GetRolesAsync(caller);
        var callerIsAdmin = callerRoles.Contains("Admin");

        IQueryable<ApplicationUser> q = _db.Users.AsQueryable();

        if (!callerIsAdmin)
        {
            var managedIds = await GetManagedUserIdsForManagerAsync();
            q = q.Where(u => managedIds.Contains(u.Id));
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            var roleName = NormalizeRole(role);
            if (roleName == null)
                return BadRequest(new { message = "Invalid role filter." });

            if (!callerIsAdmin && roleName is not ("SocialWorker" or "Donor"))
                return StatusCode(403, new { message = "Managers may only filter by SocialWorker or Donor." });

            var roleEntity = await _db.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Name == roleName);
            if (roleEntity == null)
                return Ok(new { Items = Array.Empty<StaffAccountSummaryDto>(), TotalCount = 0 });

            var roleId = roleEntity.Id;
            q = q.Where(u => _db.UserRoles.Any(ur => ur.UserId == u.Id && ur.RoleId == roleId));
        }

        q = q.OrderBy(u => u.Email);
        var totalCount = await q.CountAsync();
        var page = await q
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = new List<StaffAccountSummaryDto>();
        foreach (var u in page)
        {
            var roles = await _userManager.GetRolesAsync(u);
            if (!callerIsAdmin && roles.Any(r => r is "Admin" or "Manager"))
                continue;

            items.Add(ToSummary(u, roles));
        }

        return Ok(new { Items = items, TotalCount = totalCount });
    }

    [HttpGet("{userId}", Name = "StaffAccountById")]
    public async Task<IActionResult> Get(string userId)
    {
        var caller = await _userManager.GetUserAsync(User);
        if (caller == null)
            return Unauthorized();

        var target = await _userManager.FindByIdAsync(userId);
        if (target == null)
            return NotFound(new { message = "User not found." });

        var deny = await DenyManagerAccessToTargetAsync(caller, target);
        if (deny != null)
            return deny;

        var roles = await _userManager.GetRolesAsync(target);
        return Ok(ToSummary(target, roles));
    }

    [HttpPut("{userId}")]
    public async Task<IActionResult> Update(string userId, [FromBody] UpdateStaffAccountDto? dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Invalid body." });

        var caller = await _userManager.GetUserAsync(User);
        if (caller == null)
            return Unauthorized();

        var callerRoles = await _userManager.GetRolesAsync(caller);
        var callerIsAdmin = callerRoles.Contains("Admin");

        var target = await _userManager.FindByIdAsync(userId);
        if (target == null)
            return NotFound(new { message = "User not found." });

        var deny = await DenyManagerAccessToTargetAsync(caller, target);
        if (deny != null)
            return deny;

        var targetRoles = await _userManager.GetRolesAsync(target);

        if (!string.IsNullOrWhiteSpace(dto.DisplayName))
        {
            var d = dto.DisplayName.Trim();
            target.DisplayName = d.Length > 100 ? d[..100] : d;
        }

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            var email = dto.Email.Trim();
            var existing = await _userManager.FindByEmailAsync(email);
            if (existing != null && existing.Id != target.Id)
                return BadRequest(new { message = "Another account already uses this email." });

            var uname = await _userManager.SetUserNameAsync(target, email);
            if (!uname.Succeeded)
            {
                var err = string.Join(" ", uname.Errors.Select(e => e.Description));
                return BadRequest(new { message = string.IsNullOrEmpty(err) ? "Could not update email." : err });
            }
            var em = await _userManager.SetEmailAsync(target, email);
            if (!em.Succeeded)
            {
                var err = string.Join(" ", em.Errors.Select(e => e.Description));
                return BadRequest(new { message = string.IsNullOrEmpty(err) ? "Could not update email." : err });
            }
        }

        if (callerIsAdmin && dto.SafehouseId.HasValue)
        {
            if (targetRoles.Contains("Donor"))
                return BadRequest(new { message = "Safehouse cannot be set for donor accounts." });
            target.SafehouseId = dto.SafehouseId;
        }

        var updateResult = await _userManager.UpdateAsync(target);
        if (!updateResult.Succeeded)
        {
            var err = string.Join(" ", updateResult.Errors.Select(e => e.Description));
            return BadRequest(new { message = string.IsNullOrEmpty(err) ? "Update failed." : err });
        }

        if (!string.IsNullOrWhiteSpace(dto.Phone) && targetRoles.Contains("Donor"))
        {
            Supporter? supporter = null;
            if (target.SupporterId.HasValue)
                supporter = await _db.Supporters.FindAsync(target.SupporterId.Value);
            if (supporter == null && !string.IsNullOrEmpty(target.Id))
                supporter = await _db.Supporters.FirstOrDefaultAsync(s => s.UserId == target.Id);

            if (supporter != null)
            {
                supporter.Phone = dto.Phone.Trim();
                if (!string.IsNullOrWhiteSpace(dto.DisplayName))
                    supporter.DisplayName = target.DisplayName;
                if (!string.IsNullOrWhiteSpace(dto.Email))
                    supporter.Email = target.Email ?? supporter.Email;
                _db.Supporters.Update(supporter);
                await _db.SaveChangesAsync();
            }
        }

        var rolesOut = await _userManager.GetRolesAsync(target);
        return Ok(ToSummary(target, rolesOut));
    }

    [HttpDelete("{userId}")]
    public async Task<IActionResult> Delete(string userId)
    {
        var caller = await _userManager.GetUserAsync(User);
        if (caller == null)
            return Unauthorized();

        if (caller.Id == userId)
            return BadRequest(new { message = "You cannot delete your own account." });

        var target = await _userManager.FindByIdAsync(userId);
        if (target == null)
            return NotFound(new { message = "User not found." });

        var deny = await DenyManagerAccessToTargetAsync(caller, target);
        if (deny != null)
            return deny;

        var targetRoles = await _userManager.GetRolesAsync(target);
        if (targetRoles.Contains("Donor") && target.SupporterId.HasValue)
        {
            if (await _db.Donations.AnyAsync(d => d.SupporterId == target.SupporterId.Value))
                return BadRequest(new { message = "Cannot delete a donor with donation history." });
        }

        var supporter = target.SupporterId.HasValue
            ? await _db.Supporters.FindAsync(target.SupporterId.Value)
            : await _db.Supporters.FirstOrDefaultAsync(s => s.UserId == target.Id);

        var del = await _userManager.DeleteAsync(target);
        if (!del.Succeeded)
        {
            var err = string.Join(" ", del.Errors.Select(e => e.Description));
            return BadRequest(new { message = string.IsNullOrEmpty(err) ? "Could not delete user." : err });
        }

        if (supporter != null)
        {
            _db.Supporters.Remove(supporter);
            await _db.SaveChangesAsync();
        }

        return NoContent();
    }

    private async Task<IActionResult?> DenyManagerAccessToTargetAsync(ApplicationUser caller, ApplicationUser target)
    {
        var callerRoles = await _userManager.GetRolesAsync(caller);
        if (callerRoles.Contains("Admin"))
            return null;

        if (!callerRoles.Contains("Manager"))
            return StatusCode(403, new { message = "Not authorized." });

        var targetRoles = await _userManager.GetRolesAsync(target);
        if (targetRoles.Any(r => r is "Admin" or "Manager"))
            return StatusCode(403, new { message = "Managers cannot modify administrator or manager accounts." });

        if (!targetRoles.Contains("SocialWorker") && !targetRoles.Contains("Donor"))
            return StatusCode(403, new { message = "Managers may only manage social worker and donor accounts." });

        return null;
    }

    private async Task<HashSet<string>> GetManagedUserIdsForManagerAsync()
    {
        var swRole = await _db.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Name == "SocialWorker");
        var donorRole = await _db.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Name == "Donor");
        var ids = new HashSet<string>();
        if (swRole != null)
        {
            foreach (var id in await _db.UserRoles.Where(ur => ur.RoleId == swRole.Id).Select(ur => ur.UserId).ToListAsync())
                ids.Add(id);
        }
        if (donorRole != null)
        {
            foreach (var id in await _db.UserRoles.Where(ur => ur.RoleId == donorRole.Id).Select(ur => ur.UserId).ToListAsync())
                ids.Add(id);
        }
        return ids;
    }

    private static StaffAccountSummaryDto ToSummary(ApplicationUser u, IList<string> roles) =>
        new()
        {
            Id = u.Id,
            Email = u.Email,
            DisplayName = u.DisplayName,
            Roles = roles.OrderBy(r => r).ToList(),
            SafehouseId = u.SafehouseId,
            SocialWorkerCode = u.SocialWorkerCode,
            SupporterId = u.SupporterId,
        };

    private static string? NormalizeRole(string role)
    {
        var r = role.Trim();
        if (string.Equals(r, "Admin", StringComparison.OrdinalIgnoreCase)) return "Admin";
        if (string.Equals(r, "Manager", StringComparison.OrdinalIgnoreCase)) return "Manager";
        if (string.Equals(r, "SocialWorker", StringComparison.OrdinalIgnoreCase)) return "SocialWorker";
        if (string.Equals(r, "Donor", StringComparison.OrdinalIgnoreCase)) return "Donor";
        return null;
    }
}
