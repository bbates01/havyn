using Microsoft.EntityFrameworkCore;
using Mission11_Bates.Data;
using System.Text.Json.Serialization;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.NumberHandling =
        JsonNumberHandling.AllowNamedFloatingPointLiterals;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

// enable cors for frontend communication
builder.Services.AddCors(options => 
    options.AddPolicy("AllowReactAppBlah",
        policy => {
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

// allow frontend on localhost:3000 to access this api
app.UseCors("AllowReactAppBlah");

app.UseAuthorization();

// register all controller routes
app.MapControllers();

app.Run();
