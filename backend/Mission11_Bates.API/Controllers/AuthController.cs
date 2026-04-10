using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mission11_Bates.Data;
using Mission11_Bates.Dtos;
using QRCoder;

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
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null)
                return Unauthorized(new { message = "Invalid email or password." });

            var result = await _signInManager.PasswordSignInAsync(
                user, dto.Password, isPersistent: dto.RememberMe, lockoutOnFailure: false);

            if (result.Succeeded)
                return Ok(new { message = "Login successful." });

            if (result.RequiresTwoFactor)
                return Ok(new { requiresMfa = true, message = "MFA verification required." });

            if (result.IsLockedOut)
                return StatusCode(423, new { message = "Account locked. Try again later." });

            return Unauthorized(new { message = "Invalid email or password." });
        }

        // POST /api/auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDonorDto? dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Invalid registration data." });

            var donorResult = await CreateDonorAccountWithoutSignInAsync(dto, acquisitionChannel: "Web");
            if (donorResult.Error != null)
                return donorResult.Error;

            await _signInManager.PasswordSignInAsync(
                donorResult.User!, dto.Password, isPersistent: false, lockoutOnFailure: false);

            return Ok(new { message = "Registration successful." });
        }

        // POST /api/auth/create-user — Admin or Manager (Managers cannot create Admins or Managers)
        [HttpPost("create-user")]
        [Authorize(Policy = "StaffManagement")]
        public async Task<IActionResult> CreateUser([FromBody] CreateStaffUserDto? dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Invalid request body." });

            var caller = await _userManager.GetUserAsync(User);
            if (caller == null)
                return Unauthorized();

            var callerRoles = await _userManager.GetRolesAsync(caller);
            var callerIsAdmin = callerRoles.Contains("Admin");
            var callerIsManager = callerRoles.Contains("Manager");

            var email = dto.Email?.Trim() ?? "";
            var password = dto.Password ?? "";
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
                return BadRequest(new { message = "Email and password are required." });

            if (await _userManager.FindByEmailAsync(email) != null)
                return BadRequest(new { message = "An account with this email already exists." });

            var roleNorm = NormalizeStaffRole(dto.Role);
            if (roleNorm == null)
                return BadRequest(new { message = "Role must be Admin, Manager, SocialWorker, or Donor." });

            if (roleNorm == "Admin" && !callerIsAdmin)
                return StatusCode(403, new { message = "Only administrators can create admin accounts." });

            if (roleNorm == "Manager" && callerIsManager && !callerIsAdmin)
                return StatusCode(403, new { message = "Managers cannot create manager accounts." });

            switch (roleNorm)
            {
                case "Donor":
                    {
                        var donorDto = new RegisterDonorDto
                        {
                            Email = email,
                            Password = password,
                            FirstName = dto.FirstName ?? "",
                            LastName = dto.LastName ?? "",
                            Phone = dto.Phone ?? "",
                            Region = dto.Region ?? "",
                            Country = dto.Country ?? "",
                            SupporterType = dto.SupporterType,
                            OrganizationName = dto.OrganizationName,
                        };
                        var donorResult = await CreateDonorAccountWithoutSignInAsync(donorDto, acquisitionChannel: "Staff");
                        if (donorResult.Error != null)
                            return donorResult.Error;
                        return Ok(new { message = "User created successfully." });
                    }

                case "Manager":
                    {
                        int? safehouseId = null;
                        if (callerIsAdmin)
                        {
                            if (!dto.SafehouseId.HasValue)
                                return BadRequest(new { message = "Safehouse is required for manager accounts." });
                            safehouseId = dto.SafehouseId.Value;
                            if (!await _db.Safehouses.AnyAsync(s => s.SafehouseId == safehouseId.Value))
                                return BadRequest(new { message = "Safehouse not found." });
                        }
                        else
                        {
                            if (caller.SafehouseId == null)
                                return StatusCode(403, new { message = "Your account is not assigned to a safehouse." });
                            safehouseId = caller.SafehouseId;
                        }

                        var displayName = StaffDisplayName(dto.DisplayName, email);
                        var user = new ApplicationUser
                        {
                            UserName = email,
                            Email = email,
                            EmailConfirmed = true,
                            DisplayName = displayName,
                            SafehouseId = safehouseId,
                        };
                        var createResult = await _userManager.CreateAsync(user, password);
                        if (!createResult.Succeeded)
                        {
                            var err = string.Join(" ", createResult.Errors.Select(e => e.Description));
                            return BadRequest(new { message = string.IsNullOrEmpty(err) ? "Could not create account." : err });
                        }
                        await _userManager.AddToRoleAsync(user, "Manager");
                        return Ok(new { message = "User created successfully." });
                    }

                case "SocialWorker":
                    {
                        var code = await NextSocialWorkerCodeAsync();
                        for (var attempt = 0; attempt < 8; attempt++)
                        {
                            if (!await _userManager.Users.AnyAsync(u => u.SocialWorkerCode == code))
                                break;
                            if (!TryParseSwCodeSuffix(code, out var taken))
                                return BadRequest(new { message = "Could not assign a unique social worker code." });
                            code = $"SW-{(taken + 1):D2}";
                        }

                        if (await _userManager.Users.AnyAsync(u => u.SocialWorkerCode == code))
                            return BadRequest(new { message = "Could not assign a unique social worker code." });

                        var displayName = StaffDisplayName(dto.DisplayName, email);
                        var user = new ApplicationUser
                        {
                            UserName = email,
                            Email = email,
                            EmailConfirmed = true,
                            DisplayName = displayName,
                            SocialWorkerCode = code,
                        };
                        var createResult = await _userManager.CreateAsync(user, password);
                        if (!createResult.Succeeded)
                        {
                            var err = string.Join(" ", createResult.Errors.Select(e => e.Description));
                            return BadRequest(new { message = string.IsNullOrEmpty(err) ? "Could not create account." : err });
                        }
                        await _userManager.AddToRoleAsync(user, "SocialWorker");
                        return Ok(new { message = "User created successfully.", socialWorkerCode = code });
                    }

                case "Admin":
                    {
                        var displayName = StaffDisplayName(dto.DisplayName, email);
                        var user = new ApplicationUser
                        {
                            UserName = email,
                            Email = email,
                            EmailConfirmed = true,
                            DisplayName = displayName,
                        };
                        var createResult = await _userManager.CreateAsync(user, password);
                        if (!createResult.Succeeded)
                        {
                            var err = string.Join(" ", createResult.Errors.Select(e => e.Description));
                            return BadRequest(new { message = string.IsNullOrEmpty(err) ? "Could not create account." : err });
                        }
                        await _userManager.AddToRoleAsync(user, "Admin");
                        return Ok(new { message = "User created successfully." });
                    }

                default:
                    return BadRequest(new { message = "Unsupported role." });
            }
        }

        private static string? NormalizeStaffRole(string? role)
        {
            if (string.IsNullOrWhiteSpace(role)) return null;
            var r = role.Trim();
            if (string.Equals(r, "Admin", StringComparison.OrdinalIgnoreCase)) return "Admin";
            if (string.Equals(r, "Manager", StringComparison.OrdinalIgnoreCase)) return "Manager";
            if (string.Equals(r, "SocialWorker", StringComparison.OrdinalIgnoreCase)) return "SocialWorker";
            if (string.Equals(r, "Donor", StringComparison.OrdinalIgnoreCase)) return "Donor";
            return null;
        }

        private static string StaffDisplayName(string? displayName, string email)
        {
            var d = displayName?.Trim();
            if (string.IsNullOrEmpty(d))
                d = email;
            return d.Length > 100 ? d[..100] : d;
        }

        private static bool TryParseSwCodeSuffix(string code, out int n)
        {
            n = 0;
            if (string.IsNullOrWhiteSpace(code)) return false;
            var t = code.Trim();
            if (!t.StartsWith("SW-", StringComparison.OrdinalIgnoreCase)) return false;
            var suffix = t.Length > 3 ? t[3..] : "";
            return int.TryParse(suffix, out n) && n >= 0;
        }

        private async Task<string> NextSocialWorkerCodeAsync()
        {
            var fromUsers = await _userManager.Users
                .Where(u => u.SocialWorkerCode != null)
                .Select(u => u.SocialWorkerCode!)
                .ToListAsync();

            var fromResidents = await _db.Residents
                .Where(r => r.AssignedSocialWorker != null)
                .Select(r => r.AssignedSocialWorker!)
                .Distinct()
                .ToListAsync();

            var max = 0;
            foreach (var c in fromUsers.Concat(fromResidents))
            {
                if (TryParseSwCodeSuffix(c, out var n))
                    max = Math.Max(max, n);
            }

            var next = max + 1;
            return $"SW-{next:D2}";
        }

        /// <summary>Creates supporter + donor user + Donor role. Does not sign in. Returns Error or User.</summary>
        private async Task<DonorCreateResult> CreateDonorAccountWithoutSignInAsync(
            RegisterDonorDto dto,
            string acquisitionChannel)
        {
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
                return new DonorCreateResult { Error = BadRequest(new { message = "Email and password are required." }) };

            if (string.IsNullOrEmpty(firstName) || string.IsNullOrEmpty(lastName))
                return new DonorCreateResult { Error = BadRequest(new { message = "First and last name are required." }) };

            if (string.IsNullOrEmpty(phone) || string.IsNullOrEmpty(region) || string.IsNullOrEmpty(country))
                return new DonorCreateResult { Error = BadRequest(new { message = "Phone, region, and country are required." }) };

            var isOrg = supporterType.Equals("Organization", StringComparison.OrdinalIgnoreCase);
            if (isOrg && string.IsNullOrEmpty(organizationName))
                return new DonorCreateResult { Error = BadRequest(new { message = "Organization name is required for organization accounts." }) };

            if (await _userManager.FindByEmailAsync(email) != null)
                return new DonorCreateResult { Error = BadRequest(new { message = "An account with this email already exists." }) };

            if (await _db.Supporters.AnyAsync(s => s.Email == email))
                return new DonorCreateResult { Error = BadRequest(new { message = "This email is already registered as a supporter." }) };

            var supporterDisplayName = isOrg && !string.IsNullOrEmpty(organizationName)
                ? organizationName
                : $"{firstName} {lastName}".Trim();

            if (string.IsNullOrEmpty(supporterDisplayName))
                return new DonorCreateResult { Error = BadRequest(new { message = "Display name could not be determined." }) };

            var userDisplayName = supporterDisplayName.Length > 100
                ? supporterDisplayName[..100]
                : supporterDisplayName;

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
                AcquisitionChannel = acquisitionChannel,
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
                return new DonorCreateResult
                {
                    Error = BadRequest(new { message = string.IsNullOrEmpty(err) ? "Could not create account." : err }),
                };
            }

            await _userManager.AddToRoleAsync(user, "Donor");

            supporter.UserId = user.Id;
            await _db.SaveChangesAsync();

            return new DonorCreateResult { User = user };
        }

        private sealed class DonorCreateResult
        {
            public ApplicationUser? User { get; init; }
            public IActionResult? Error { get; init; }
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

        [HttpGet("mfa/status")]
        [Authorize]
        public async Task<IActionResult> GetMfaStatus()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            return Ok(new MfaStatusDto
            {
                IsMfaEnabled = await _userManager.GetTwoFactorEnabledAsync(user),
                HasAuthenticator = await _userManager.GetAuthenticatorKeyAsync(user) != null
            });
        }

        [HttpPost("mfa/setup")]
        [Authorize]
        public async Task<IActionResult> SetupMfa()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            await _userManager.ResetAuthenticatorKeyAsync(user);
            var unformattedKey = await _userManager.GetAuthenticatorKeyAsync(user);

            if (string.IsNullOrEmpty(unformattedKey))
                return StatusCode(500, new { message = "Failed to generate authenticator key." });

            var sharedKey = FormatKey(unformattedKey);

            var email = await _userManager.GetEmailAsync(user);
            var authenticatorUri = GenerateQrCodeUri("Havyn", email!, unformattedKey);

            string qrCodeDataUri;
            using (var qrGenerator = new QRCodeGenerator())
            {
                var qrCodeData = qrGenerator.CreateQrCode(authenticatorUri, QRCodeGenerator.ECCLevel.Q);
                var pngQrCode = new PngByteQRCode(qrCodeData);
                var qrCodeBytes = pngQrCode.GetGraphic(4);
                qrCodeDataUri = $"data:image/png;base64,{Convert.ToBase64String(qrCodeBytes)}";
            }

            return Ok(new MfaSetupDto
            {
                SharedKey = sharedKey,
                AuthenticatorUri = authenticatorUri,
                QrCodeDataUri = qrCodeDataUri
            });
        }

        [HttpPost("mfa/enable")]
        [Authorize]
        public async Task<IActionResult> EnableMfa([FromBody] EnableMfaDto dto)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var code = dto.VerificationCode.Replace(" ", "").Replace("-", "");

            var isValid = await _userManager.VerifyTwoFactorTokenAsync(
                user,
                _userManager.Options.Tokens.AuthenticatorTokenProvider,
                code);

            if (!isValid)
                return BadRequest(new { message = "Invalid verification code. Please try again." });

            await _userManager.SetTwoFactorEnabledAsync(user, true);

            var recoveryCodes = await _userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);

            return Ok(new
            {
                message = "MFA has been enabled.",
                recoveryCodes = recoveryCodes!.ToArray()
            });
        }

        [HttpPost("mfa/disable")]
        [Authorize]
        public async Task<IActionResult> DisableMfa([FromBody] DisableMfaDto dto)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (!await _userManager.CheckPasswordAsync(user, dto.Password))
                return BadRequest(new { message = "Incorrect password." });

            await _userManager.SetTwoFactorEnabledAsync(user, false);
            await _userManager.ResetAuthenticatorKeyAsync(user);

            return Ok(new { message = "MFA has been disabled." });
        }

        [HttpPost("mfa/verify")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyMfa([FromBody] VerifyMfaDto dto)
        {
            var code = dto.Code.Replace(" ", "").Replace("-", "");

            var result = await _signInManager.TwoFactorAuthenticatorSignInAsync(
                code,
                dto.RememberMe,
                rememberClient: false);

            if (result.Succeeded)
                return Ok(new { message = "MFA verification successful." });

            if (result.IsLockedOut)
                return StatusCode(423, new { message = "Account locked out. Try again later." });

            return Unauthorized(new { message = "Invalid verification code." });
        }

        [HttpPost("mfa/verify-recovery")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyRecoveryCode([FromBody] VerifyMfaDto dto)
        {
            var code = dto.Code.Replace(" ", "").Replace("-", "");

            var result = await _signInManager.TwoFactorRecoveryCodeSignInAsync(code);

            if (result.Succeeded)
                return Ok(new { message = "Recovery code accepted." });

            return Unauthorized(new { message = "Invalid recovery code." });
        }

        private static string FormatKey(string unformattedKey)
        {
            var result = new StringBuilder();
            int currentPosition = 0;
            while (currentPosition + 4 < unformattedKey.Length)
            {
                result.Append(unformattedKey.AsSpan(currentPosition, 4)).Append(' ');
                currentPosition += 4;
            }
            if (currentPosition < unformattedKey.Length)
                result.Append(unformattedKey.AsSpan(currentPosition));
            return result.ToString().ToLowerInvariant();
        }

        private static string GenerateQrCodeUri(string issuer, string email, string unformattedKey)
        {
            return $"otpauth://totp/{UrlEncoder.Default.Encode(issuer)}:{UrlEncoder.Default.Encode(email)}" +
                   $"?secret={unformattedKey}&issuer={UrlEncoder.Default.Encode(issuer)}&digits=6";
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

    public class CreateStaffUserDto
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
        public string Role { get; set; } = "";
        public string? DisplayName { get; set; }
        public int? SafehouseId { get; set; }
        public string? SocialWorkerCode { get; set; }

        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Phone { get; set; }
        public string? Region { get; set; }
        public string? Country { get; set; }
        public string? SupporterType { get; set; }
        public string? OrganizationName { get; set; }
    }
}
