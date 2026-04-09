using Microsoft.EntityFrameworkCore;
using Mission11_Bates.Data;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<HavynDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

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

// enforce https in production
app.UseHttpsRedirection();

app.UseAuthorization();

// register all controller routes
app.MapControllers();

app.Run();
