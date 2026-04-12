using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Havyn.Data;

namespace Havyn.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TodoController : ControllerBase
    {
        private HavynDbContext _context;

        public TodoController(HavynDbContext temp) => _context = temp;

        [HttpGet("ByUser/{userId}")]
        public IActionResult GetByUser(string userId)
        {
            var items = _context.TodoItems
                .Where(t => t.UserId == userId)
                .OrderBy(t => t.IsCompleted)
                .ThenBy(t => t.DisplayOrder)
                .ToList();

            return Ok(items);
        }

        [HttpPost("AddTodo")]
        public IActionResult AddTodo([FromBody] TodoItem newTodo)
        {
            _context.TodoItems.Add(newTodo);
            _context.SaveChanges();
            return Ok(newTodo);
        }

        [HttpPut("UpdateTodo/{todoId}")]
        public IActionResult UpdateTodo(int todoId, [FromBody] TodoItem updatedTodo)
        {
            var existing = _context.TodoItems.Find(todoId);

            if (existing == null)
            {
                return NotFound(new { message = "Todo item not found" });
            }

            existing.TaskText = updatedTodo.TaskText;
            existing.IsCompleted = updatedTodo.IsCompleted;
            existing.CompletedAt = updatedTodo.CompletedAt;
            existing.DisplayOrder = updatedTodo.DisplayOrder;

            _context.TodoItems.Update(existing);
            _context.SaveChanges();

            return Ok(existing);
        }

        [HttpDelete("DeleteTodo/{todoId}")]
        [Authorize(Policy = "AdminOnly")]
        public IActionResult DeleteTodo(int todoId)
        {
            var todo = _context.TodoItems.Find(todoId);

            if (todo == null)
            {
                return NotFound(new { message = "Todo item not found" });
            }

            _context.TodoItems.Remove(todo);
            _context.SaveChanges();

            return NoContent();
        }

        [HttpDelete("ClearCompleted/{userId}")]
        [Authorize(Policy = "AdminOnly")]
        public IActionResult ClearCompleted(string userId)
        {
            var completedItems = _context.TodoItems
                .Where(t => t.UserId == userId && t.IsCompleted)
                .ToList();

            _context.TodoItems.RemoveRange(completedItems);
            _context.SaveChanges();

            return NoContent();
        }
    }
}
