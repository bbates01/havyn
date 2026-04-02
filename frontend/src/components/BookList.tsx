import { useEffect, useState } from "react";
import type { Book } from "../types/Book";
import { useNavigate } from "react-router-dom";
import { fetchBooks } from "../api/BooksAPI";
import Pagination from "./Pagination";

// component to display books with pagination and sorting
function BookList({selectedCategories}: {selectedCategories: string[]}) {

    const [books, setBooks] = useState<Book[]>([]);
    const [pageSize, setPageSize] = useState<number>(5);
    const [pageIndex, setPageIndex] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [sortOrder, setSortOrder] = useState<string>("asc");
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // fetch books when filters or pagination changes
    useEffect(() => {
        const loadBooks = async () => {
            try {
                setLoading(true);
                const data = await fetchBooks(pageSize, pageIndex, sortOrder, selectedCategories);

                setBooks(data.books);
                setTotalPages(Math.ceil(data.totalNumBooks / pageSize));
            } catch (e) {
                setError((e as Error).message);
            } finally {
                setLoading(false);
            }
        };

        loadBooks();
    }, [pageSize, pageIndex, sortOrder, selectedCategories]);

    if (loading) return <p>Loading books...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;

    return (
        <section className="panel">
            <div className="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center gap-3 mb-4">

                <div className="d-flex align-items-center gap-2">
                    <span className="fw-semibold">Sort by Title:</span>
                    <nav aria-label="Sort order">
                        <ul className="pagination pagination-sm mb-0">
                            <li className={`page-item ${sortOrder === "asc" ? "active" : ""}`}>
                                <button
                                    id="sortAsc"
                                    className="page-link"
                                    onClick={() => setSortOrder("asc")}
                                >
                                    Asc
                                </button>
                            </li>
                            <li className={`page-item ${sortOrder === "desc" ? "active" : ""}`}>
                                <button
                                    id="sortDesc"
                                    className="page-link"
                                    onClick={() => setSortOrder("desc")}
                                >
                                    Desc
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
            
            <div className="row g-4 mb-5">
                {books.map((b) => (
                    <div className="col-md-6 col-lg-4" key={b.bookId}>
                        <div className="card h-100 border-0 shadow-sm book-card">
                            <div className="card-body">
                                <h5 className="card-title">{b.title}</h5>
                                <p className="card-text">
                                    <small>
                                        <div><strong>Author:</strong> {b.author}</div>
                                        <div><strong>Publisher:</strong> {b.publisher}</div>
                                        <div><strong>ISBN:</strong> {b.isbn}</div>
                                        <div><strong>Classification:</strong> {b.classification}</div>
                                        <div><strong>Category:</strong> {b.category}</div>
                                        <div><strong>Page count:</strong> {b.pageCount}</div>
                                        <div><strong>Price:</strong> ${b.price.toFixed(2)}</div>
                                    </small>
                                </p>
                                <button
                                    className="btn btn-success"
                                    onClick={() => navigate(`/purchase/${b.title}/${b.bookId}/${b.price}`)}
                                >
                                    Purchase
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Pagination 
                currentPage={pageIndex}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setPageIndex}
                onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPageIndex(1);
                }}
            />
        </section>
    );
};

export default BookList;
