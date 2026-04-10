using Microsoft.AspNetCore.Identity;

namespace Mission11_Bates.Data
{
    public static class SeedData
    {
        public static async Task Initialize(IServiceProvider serviceProvider)
        {
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var db = serviceProvider.GetRequiredService<HavynDbContext>();

            // 1. Create roles
            string[] roles = { "Admin", "Manager", "SocialWorker", "Donor" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));
            }

            // 2. Admin (1 account)
            await CreateUser(userManager, "admin@havyn.org", "Admin2026!Havyn", "Admin");

            // 2b. MFA test account — graders see the TOTP prompt but use admin@havyn.org to log in
            var mfaUser = await CreateUser(userManager, "mfa-test@havyn.org", "MfaTest2026!Havyn", "Donor");
            if (mfaUser != null)
            {
                var key = await userManager.GetAuthenticatorKeyAsync(mfaUser);
                if (key == null)
                {
                    await userManager.ResetAuthenticatorKeyAsync(mfaUser);
                    key = await userManager.GetAuthenticatorKeyAsync(mfaUser);
                }
                if (!await userManager.GetTwoFactorEnabledAsync(mfaUser))
                {
                    await userManager.SetTwoFactorEnabledAsync(mfaUser, true);
                    Console.WriteLine($"[SeedData] MFA enabled for mfa-test@havyn.org — authenticator key: {key}");
                }
            }

            // 3. Managers (1 per safehouse)
            var safehouses = db.Safehouses.ToList();
            foreach (var sh in safehouses)
            {
                var email = $"manager-sh{sh.SafehouseId}@havyn.org";
                await CreateUser(userManager, email, "Manager2026!Havyn", "Manager",
                    safehouseId: sh.SafehouseId);
            }

            // 4. Social Workers (unique codes from residents table)
            var swCodes = db.Residents
                .Select(r => r.AssignedSocialWorker)
                .Where(sw => sw != null)
                .Distinct()
                .ToList();

            foreach (var swCode in swCodes)
            {
                // "SW-01" becomes "sw01@havyn.org"
                var email = $"{swCode!.ToLower().Replace("-", "")}@havyn.org";
                await CreateUser(userManager, email, "Worker2026!Havyn", "SocialWorker",
                    socialWorkerCode: swCode);
            }

            // 5. Donors (1 per supporter)
            var supporters = db.Supporters.ToList();
            foreach (var supporter in supporters)
            {
                if (string.IsNullOrWhiteSpace(supporter.Email)) continue;

                var user = await CreateUser(userManager, supporter.Email, "Donor2026!!Havyn", "Donor",
                    supporterId: supporter.SupporterId);

                // Link the supporter record back to the Identity user
                if (user != null && supporter.UserId == null)
                {
                    supporter.UserId = user.Id;
                    db.Supporters.Update(supporter);
                }
            }

            await db.SaveChangesAsync();
        }

        private static async Task<ApplicationUser?> CreateUser(
            UserManager<ApplicationUser> userManager,
            string email,
            string password,
            string role,
            int? safehouseId = null,
            string? socialWorkerCode = null,
            int? supporterId = null)
        {
            var existing = await userManager.FindByEmailAsync(email);
            if (existing != null) return existing;

            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                SafehouseId = safehouseId,
                SocialWorkerCode = socialWorkerCode,
                SupporterId = supporterId,
                DisplayName = email  // <-- this is the only new line
            };

            var result = await userManager.CreateAsync(user, password);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(user, role);
                return user;
            }

            foreach (var error in result.Errors)
                Console.WriteLine($"[SeedData] Failed to create {email}: {error.Description}");

            return null;
        }
    }
}