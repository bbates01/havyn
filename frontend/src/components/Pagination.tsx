interface PaginationProps {
    currentPage: number,
    totalPages: number,
    pageSize: number,
    onPageChange: (newPage: number) => void;
    onPageSizeChange: (newSize: number) => void;
}

const Pagination = ({
    currentPage,
    totalPages,
    pageSize,
    onPageChange,
    onPageSizeChange
}: PaginationProps) => {
    return (
        <>
        <nav aria-label="Page navigation" className="mb-4">
                <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
                            Previous
                        </button>
                    </li>
                    {[...Array(totalPages)].map((_, i) => (
                        <li key={i + 1} className={`page-item ${currentPage === (i + 1) ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => onPageChange(i + 1)}>
                                {i + 1}
                            </button>
                        </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
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
                        onPageSizeChange(Number(p.target.value));
                        onPageChange(1);
                    }}
                >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                </select>
            </div>
        </>
    );
};

export default Pagination;