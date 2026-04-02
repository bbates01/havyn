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
        
        // constructor to inject database context
        public BookController(BookDbContext temp) => _context = temp;

        // retrieve paginated, filtered, and sorted books from database
        [HttpGet("AllBooks")]
        public IActionResult GetAllBooks(
            int pageSize = 10, 
            int pageIndex = 1, 
            string sortBy = "Title", 
            string sortOrder = "desc", 
            [FromQuery] List<string>? bookCategories = null)
        {
            var query = _context.Books.AsQueryable();

            // apply sorting by title
            if (sortBy == "Title" && sortOrder == "desc")
            {
                query = query.OrderByDescending(x => x.Title);
            }
            else if (sortBy == "Title" && sortOrder == "asc")
            {
                query = query.OrderBy(x => x.Title);
            }

            // filter by selected categories if provided
            if (bookCategories != null && bookCategories.Any()) 
            {
                query = query.Where(b => bookCategories.Contains(b.Category));
            }

            // get total count before paging
            var totalNumBooks = query.Count();

            // apply pagination using skip and take
            var books = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            // return books with total count for pagination info
            var newDataObj = new
            {
                Books = books,
                TotalNumBooks = totalNumBooks
            };
            
            return Ok(newDataObj);
        }

        // get all unique catogories from the book collection
        [HttpGet("GetBookCategories")]
        public IActionResult GetBookCategories()
        {
            var bookCategories = _context.Books
                .Select(b => b.Category)
                .Distinct()
                .ToList();

            return Ok(bookCategories);
        }

        [HttpPost("AddBook")]
        public IActionResult AddBook([FromBody] Book newBook) 
        {
            _context.Books.Add(newBook);
            _context.SaveChanges();
            return Ok(newBook);
        }

        [HttpPut("UpdateBook/{bookId}")]
        public IActionResult UpdateBook(int bookId, [FromBody] Book updatedBook)
        {
            var existingBook = _context.Books.Find(bookId);

            existingBook.Title = updatedBook.Title;
            existingBook.Author = updatedBook.Author;
            existingBook.Publisher = updatedBook.Publisher;
            existingBook.ISBN = updatedBook.ISBN;
            existingBook.Classification = updatedBook.Classification;
            existingBook.Category = updatedBook.Category;
            existingBook.PageCount = updatedBook.PageCount;
            existingBook.Price = updatedBook.Price;

            _context.Books.Update(existingBook);
            _context.SaveChanges();

            return Ok(existingBook);
        }

        [HttpDelete("DeleteBook/{bookId}")]
        public IActionResult DeleteBook(int bookId)
        {
            var book = _context.Books.Find(bookId);

            if (book == null)
            {
                return NotFound(new {message = "Book not found"});
            }

            _context.Books.Remove(book);
            _context.SaveChanges();

            return NoContent();
        }

    }
}
