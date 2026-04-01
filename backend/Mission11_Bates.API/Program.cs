using Microsoft.Build.Framework;
using Microsoft.EntityFrameworkCore;
using Mission11_Bates.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<BookDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("BookConnection")));

// enable cors for frontend communication
builder.Services.AddCors();

var app = builder.Build();

// map openapi endpoint in development environement (note typo is intentional)
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// allow frontend on localhost:3000 to access this api
app.UseCors(x => x.WithOrigins("http://localhost:3000"));

// enforce https in production
app.UseHttpsRedirection();

app.UseAuthorization();

// register all controller routes
app.MapControllers();

app.Run();
