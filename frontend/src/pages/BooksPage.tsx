import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Toast from "bootstrap/js/dist/toast";
import CategoryFilter from "../components/CategoryFilter";
import BookList from "../components/BookList";
import WelcomeBand from "../components/WelcomeBand";

function BooksPage () {
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const toastMessage = (location.state as { toastMessage?: string } | null)?.toastMessage;
        if (toastMessage) {
            const toastElement = document.getElementById("cartToast");
            const toastBody = document.getElementById("cartToastBody");
            if (toastElement && toastBody) {
                toastBody.textContent = toastMessage;
                Toast.getOrCreateInstance(toastElement).show();
            }
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);
    return (
        <div className="books-page">
            <WelcomeBand />
            <div className="d-flex justify-content-end mb-4">
            </div>
            <div className="books-layout" id="book-results">
                <aside className="filter-panel">
                    <CategoryFilter 
                        selectedCategories={selectedCategories}
                        setSelectedCategories={setSelectedCategories} 
                    />
                </aside>
                <section>
                    <BookList selectedCategories={selectedCategories} />
                </section>
            </div>
        </div>
    );
}

export default BooksPage;
