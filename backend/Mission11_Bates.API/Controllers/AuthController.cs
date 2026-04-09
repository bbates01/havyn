using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

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
}