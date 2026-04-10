using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
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

        public AuthController(
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager)
        {
            _signInManager = signInManager;
            _userManager = userManager;
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
}
