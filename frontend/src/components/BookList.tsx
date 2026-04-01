import { useEffect, useState } from "react";
import type { Book } from "../types/Book";
import { useNavigate } from "react-router-dom";

// component to display books with pagination and sorting
function BookList({selectedCategories}: {selectedCategories: string[]}) {

    const [books, setBooks] = useState<Book[]>([]);
    const [pageSize, setPageSize] = useState<number>(5);
    const [pageIndex, setPageIndex] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [sortOrder, setSortOrder] = useState<string>("asc");
    const navigate = useNavigate();

    // fetch books when filters or pagination changes
    useEffect(() => {
        const fecthBooks = async () => { // typo: should be 'fetchBooks'
            // build query string for selected categories
            const categoryParams = selectedCategories
                .map((cat) => `bookCategories=${encodeURIComponent(cat)}`)
                .join('&');

            // call api with pagination, sort, and filter parameters
            const response = await fetch(
                `https://localhost:7100/Book/AllBooks?pageSize=${pageSize}&pageIndex=${pageIndex}&sortBy=Title&sortOrder=${sortOrder}${selectedCategories.length ? `&${categoryParams}`: ``}`
            );
            const data = await response.json();
            setBooks(data.books);
            setTotalPages(Math.ceil(data.totalNumBooks / pageSize));
        };

        fecthBooks();
    }, [pageSize, pageIndex, sortOrder, selectedCategories]);

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

            <nav aria-label="Page navigation" className="mb-4">
                <ul className="pagination justify-content-center">
                    <li className={`page-item ${pageIndex === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setPageIndex(pageIndex - 1)} disabled={pageIndex === 1}>
                            Previous
                        </button>
                    </li>
                    {[...Array(totalPages)].map((_, i) => (
                        <li key={i + 1} className={`page-item ${pageIndex === (i + 1) ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPageIndex(i + 1)}>
                                {i + 1}
                            </button>
                        </li>
                    ))}
                    <li className={`page-item ${pageIndex === totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setPageIndex(pageIndex + 1)} disabled={pageIndex === totalPages}>
                            Next
                        </button>
                    </li>
                </ul>
            </nav>

            <div className="d-flex justify-content-center align-items-center gap-2">
                <label htmlFor="pageSize" className="form-label mb-0">
                    Results per page:
                </label>
                <select
                    id="pageSize"
                    className="form-select form-select-sm"
                    style={{ width: 'auto' }}
                    value={pageSize}
                    onChange={(p) => {
                        setPageSize(Number(p.target.value))
                        setPageIndex(1)
                    }}
                >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                </select>
            </div>
        </section>
    );
}

export default BookList;
