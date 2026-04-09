using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Mission11_Bates.Data;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database
var defaultConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// In Azure App Service, ConnectionStrings:DefaultConnection is typically injected at runtime.
// Locally, we fall back to DATABASE_URL if appsettings.json contains the placeholder value.
if (string.IsNullOrWhiteSpace(defaultConnectionString) ||
    string.Equals(defaultConnectionString, "SET_IN_AZURE_APP_SERVICE", StringComparison.OrdinalIgnoreCase))
{
    defaultConnectionString = builder.Configuration["DATABASE_URL"];
}

if (string.IsNullOrWhiteSpace(defaultConnectionString) ||
    string.Equals(defaultConnectionString, "SET_IN_AZURE_APP_SERVICE", StringComparison.OrdinalIgnoreCase))
{
    throw new InvalidOperationException(
        "Database connection string is not configured. Set ConnectionStrings:DefaultConnection (Azure) or DATABASE_URL (local).");
}

builder.Services.AddDbContext<HavynDbContext>(options => options.UseNpgsql(defaultConnectionString));

// Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        // Password policy — adjust these to match what your IS 414 class taught
        options.Password.RequiredLength = 12;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireDigit = true;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequiredUniqueChars = 4;

        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<HavynDbContext>()
    .AddDefaultTokenProviders();

// Cookie config — makes Identity work with your React SPA
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.None; // Required for cross-origin cookie auth
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;

    // Return 401/403 JSON instead of redirecting to a login page (default Identity behavior)
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = 401;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = 403;
        return Task.CompletedTask;
    };
});

// Authorization policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));
    options.AddPolicy("StaffManagement", p => p.RequireRole("Admin", "Manager"));
    options.AddPolicy("CaseAccess", p => p.RequireRole("Admin", "Manager", "SocialWorker"));
    options.AddPolicy("DonorAccess", p => p.RequireRole("Donor"));
    options.AddPolicy("InternalStaff", p => p.RequireRole("Admin", "Manager", "SocialWorker"));
});

// CORS
builder.Services.AddCors(options =>
    options.AddPolicy("AllowReactAppBlah",
        policy =>
        {
            policy.WithOrigins(
                    "http://localhost:3000",
                    "https://black-river-0292ddd1e.2.azurestaticapps.net",
                    "https://lemon-rock-07f22ec1e.7.azurestaticapps.net")
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        }));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactAppBlah");

app.UseAuthentication();  // NEW — must come before UseAuthorization
app.UseAuthorization();

app.MapControllers();

// Seed roles and users on startup
using (var scope = app.Services.CreateScope())
{
    await SeedData.Initialize(scope.ServiceProvider);
}

app.Run();