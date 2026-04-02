import { useEffect, useState } from "react"
import type { Book } from "../types/Book"
import { deleteBook, fetchBooks } from "../api/BooksAPI";
import Pagination from "../components/Pagination";
import NewBookForm from "../components/NewBookForm";
import EditBookForm from "../components/EditBookForm";

const AdminBooksPage = () => {
    // State management for books and UI
    const [books, setBooks] = useState<Book[]>([]);              // List of books to display
    const [error, setError] = useState<string | null>(null);    // Error messages
    const [loading, setLoading] = useState(true);               // Loading state
    const [pageSize, setPageSize] = useState<number>(10);       // Items per page
    const [pageIndex, setPageIndex] = useState<number>(1);      // Current page number
    const [totalPages, setTotalPages] = useState<number>(0);    // Total number of pages
    const [showForm, setShowForm] = useState(false);            // Show/hide new book form
    const [editingBook, setEditingBook] = useState<Book | null>(null);  // Book being edited

    // Load books from API when page size or page index changes
    useEffect(() => {
        const loadBooks = async () => {
            try {
                const data = await fetchBooks(pageSize, pageIndex, "", []);
                setBooks(data.books);
                setTotalPages(Math.ceil(data.totalNumBooks / pageSize));
            } catch (e) {
                setError((e as Error).message);
            } finally {
                setLoading(false);
            }
        };

        loadBooks();
    }, [pageSize, pageIndex]);

    // Delete book after user confirmation
    const handleDelete = async (bookId: number) => {
        const confirmDelete = window.confirm(
            'Are you sure you want to delete this project?'
        );
        if (!confirmDelete) return;

        try {
            await deleteBook(bookId);
            setBooks(books.filter((b) => b.bookId !== bookId));  // Remove from local state
        } catch (err) {
            alert('Failed to delete project. Please try again.');
        }
    };

    if (loading) return <p>Loading books...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;

    return (
        <section className="panel">
            {/* Header with title and add book button */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Admin - Books</h2>
                {/* Show add button only when not in form or edit mode */}
                {!showForm && !editingBook && (
                    <button
                        className="btn btn-success"
                        onClick={() => setShowForm(true)}
                    >
                        Add Book
                    </button>
                )}
            </div>

            {/* Show new book form if user clicked add button */}
            {showForm && (
                <NewBookForm 
                    onSuccess={() => {
                        setShowForm(false);
                        fetchBooks(pageSize, pageIndex, "", []).then((data) =>
                            setBooks(data.books)
                        );
                    }}
                    onCancel={() => setShowForm(false)}
                />
            )}

            {/* Show edit form if user clicked edit button */}
            {editingBook && (
                <EditBookForm
                    book={editingBook}
                    onSuccess={() => {
                        setEditingBook(null);
                        fetchBooks(pageSize, pageIndex, "", []).then((data) =>
                            setBooks(data.books)
                        );
                    }}
                    onCancel={() => setEditingBook(null)}
                />
            )}

            {/* Show books table and pagination when not in form or edit mode */}
            {!showForm && !editingBook && (
                <>
                    {/* Books table */}
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>ID</th>
                                    <th>Title</th>
                                    <th>Author</th>
                                    <th>Publisher</th>
                                    <th>ISBN</th>
                                    <th>Classification</th>
                                    <th>Category</th>
                                    <th>Page Count</th>
                                    <th>Price</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Display each book as a table row */}
                                {books.map((b) => (
                                    <tr key={b.bookId}>
                                        <td className="fw-semibold">{b.bookId}</td>
                                        <td>{b.title}</td>
                                        <td>{b.author}</td>
                                        <td>{b.publisher}</td>
                                        <td>{b.isbn}</td>
                                        <td>{b.classification}</td>
                                        <td><span className="badge bg-light text-dark">{b.category}</span></td>
                                        <td>{b.pageCount}</td>
                                        <td>${b.price.toFixed(2)}</td>
                                        <td>
                                            {/* Edit and delete action buttons */}
                                            <div className="d-flex gap-2 justify-content-center">
                                                <button
                                                    className="btn btn-outline-primary btn-sm"
                                                    onClick={() => setEditingBook(b)}
                                                    title="Edit book"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm"
                                                    onClick={() => handleDelete(b.bookId)}
                                                    title="Delete book"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination controls */}
                    <Pagination 
                        currentPage={pageIndex}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        onPageChange={setPageIndex}
                        onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            setPageIndex(1);  // Reset to first page when changing page size
                        }}
                    />
                </>
            )}
        </section>
    );
};

export default AdminBooksPage;