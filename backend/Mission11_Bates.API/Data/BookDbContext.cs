using Microsoft.EntityFrameworkCore;

namespace Mission11_Bates.Data
{
    // database context for managing book entities
    public class BookDbContext : DbContext
    {
        public BookDbContext(DbContextOptions<BookDbContext> options) : base(options)
        {
        }
        // table for storing all books
        public DbSet<Book> Books { get; set; }
    }
}

