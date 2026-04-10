using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly HavynDbContext _db;

        public AuthController(
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager,
            HavynDbContext db)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _db = db;
        }

        // POST /api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null)
                return Unauthorized(new { message = "Invalid email or password." });

            var result = await _signInManager.PasswordSignInAsync(
                user, dto.Password, isPersistent: dto.RememberMe, lockoutOnFailure: false);

            if (!result.Succeeded)
                return Unauthorized(new { message = "Invalid email or password." });

            return Ok(new { message = "Login successful." });
        }

        // POST /api/auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDonorDto? dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Invalid registration data." });

            var email = dto.Email?.Trim() ?? "";
            var password = dto.Password ?? "";
            var firstName = dto.FirstName?.Trim() ?? "";
            var lastName = dto.LastName?.Trim() ?? "";
            var phone = dto.Phone?.Trim() ?? "";
            var region = dto.Region?.Trim() ?? "";
            var country = dto.Country?.Trim() ?? "";
            var supporterType = string.IsNullOrWhiteSpace(dto.SupporterType)
                ? "Individual"
                : dto.SupporterType.Trim();
            var organizationName = dto.OrganizationName?.Trim();

            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
                return BadRequest(new { message = "Email and password are required." });

            if (string.IsNullOrEmpty(firstName) || string.IsNullOrEmpty(lastName))
                return BadRequest(new { message = "First and last name are required." });

            if (string.IsNullOrEmpty(phone) || string.IsNullOrEmpty(region) || string.IsNullOrEmpty(country))
                return BadRequest(new { message = "Phone, region, and country are required." });

            var isOrg = supporterType.Equals("Organization", StringComparison.OrdinalIgnoreCase);
            if (isOrg && string.IsNullOrEmpty(organizationName))
                return BadRequest(new { message = "Organization name is required for organization accounts." });

            if (await _userManager.FindByEmailAsync(email) != null)
                return BadRequest(new { message = "An account with this email already exists." });

            if (await _db.Supporters.AnyAsync(s => s.Email == email))
                return BadRequest(new { message = "This email is already registered as a supporter." });

            var supporterDisplayName = isOrg && !string.IsNullOrEmpty(organizationName)
                ? organizationName
                : $"{firstName} {lastName}".Trim();

            if (string.IsNullOrEmpty(supporterDisplayName))
                return BadRequest(new { message = "Display name could not be determined." });

            var userDisplayName = supporterDisplayName.Length > 100
                ? supporterDisplayName[..100]
                : supporterDisplayName;

            // DB may lack IDENTITY on SupporterId (EF assumes DB-generated keys); assign explicitly.
            var nextSupporterId = await _db.Supporters.AnyAsync()
                ? await _db.Supporters.MaxAsync(s => s.SupporterId) + 1
                : 1;

            var supporter = new Supporter
            {
                SupporterId = nextSupporterId,
                SupporterType = supporterType,
                DisplayName = supporterDisplayName,
                OrganizationName = isOrg ? organizationName : null,
                FirstName = firstName,
                LastName = lastName,
                RelationshipType = "Donor",
                Region = region,
                Country = country,
                Email = email,
                Phone = phone,
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                AcquisitionChannel = "Web",
            };

            _db.Supporters.Add(supporter);
            await _db.SaveChangesAsync();

            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                DisplayName = userDisplayName,
                SupporterId = supporter.SupporterId,
            };

            var createResult = await _userManager.CreateAsync(user, password);
            if (!createResult.Succeeded)
            {
                _db.Supporters.Remove(supporter);
                await _db.SaveChangesAsync();
                var err = string.Join(" ", createResult.Errors.Select(e => e.Description));
                return BadRequest(new { message = string.IsNullOrEmpty(err) ? "Could not create account." : err });
            }

            await _userManager.AddToRoleAsync(user, "Donor");

            supporter.UserId = user.Id;
            await _db.SaveChangesAsync();

            await _signInManager.PasswordSignInAsync(user, password, isPersistent: false, lockoutOnFailure: false);

            return Ok(new { message = "Registration successful." });
        }

        // POST /api/auth/logout
        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return Ok(new { message = "Logged out." });
        }

        // GET /api/auth/me
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            if (User.Identity?.IsAuthenticated != true)
                return Ok(new
                {
                    isAuthenticated = false,
                    roles = Array.Empty<string>()
                });

            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return Ok(new
                {
                    isAuthenticated = false,
                    roles = Array.Empty<string>()
                });

            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new
            {
                isAuthenticated = true,
                userName = user.UserName,
                email = user.Email,
                roles,
                safehouseId = user.SafehouseId,
                socialWorkerCode = user.SocialWorkerCode,
                supporterId = user.SupporterId
            });
        }
    }

    public class LoginDto
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
        public bool RememberMe { get; set; } = false;
    }

    public class RegisterDonorDto
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
        public string FirstName { get; set; } = "";
        public string LastName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Region { get; set; } = "";
        public string Country { get; set; } = "";
        public string? SupporterType { get; set; }
        public string? OrganizationName { get; set; }
    }
}