using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;
using SQLitePCL;

namespace Mission11_Bates.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class BookController : ControllerBase
    {
        private BookDbContext _context;
        
        public BookController(BookDbContext temp) => _context = temp;

        [HttpGet("AllBooks")]
        public IActionResult GetAllBooks(
            int pageSize = 10, 
            int pageIndex = 1, 
            string sortBy = "Title", 
            string sortOrder = "desc", 
            [FromQuery] List<string>? bookCategories = null)
        {
            var query = _context.Books.AsQueryable();

            if (sortBy == "Title" && sortOrder == "desc")
            {
                query = query.OrderByDescending(x => x.Title);
            }
            else if (sortBy == "Title" && sortOrder == "asc")
            {
                query = query.OrderBy(x => x.Title);
            }

            if (bookCategories != null && bookCategories.Any()) 
            {
                query = query.Where(b => bookCategories.Contains(b.Category));
            }

            var totalNumBooks = query.Count();

            var books = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            var newDataObj = new
            {
                Books = books,
                TotalNumBooks = totalNumBooks
            };
            
            return Ok(newDataObj);
        }

        [HttpGet("GetBookCategories")]
        public IActionResult GetBookCategories()
        {
            var bookCategories = _context.Books
                .Select(b => b.Category)
                .Distinct()
                .ToList();

            return Ok(bookCategories);
        }
    }
}
