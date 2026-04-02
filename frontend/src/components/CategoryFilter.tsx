import { useEffect, useState } from "react";
import './CategoryFilter.css';

const API_URL = 'https://mission13-bates-backend-hebbf5ene3fuagh5.mexicocentral-01.azurewebsites.net/Book';

// filter component to select book categories
function CategoryFilter({ 
    selectedCategories, 
    setSelectedCategories,
}: {
    selectedCategories: (string[]);
    setSelectedCategories: (categories: string[]) => void;}) {

    const [categories, setCategories] = useState<string[]>([]);

    // load available categories from api on mount
    useEffect(() => {
        const fetchCategories = async () => {
            try{
                const response = await fetch(`${API_URL}/GetBookCategories`);
                const data = await response.json();
                console.log('Fetched categories: ', data);
                setCategories(data);

            } catch (error) {
                console.error('Error fetching categories', error);
            }
        };

        fetchCategories();

    }, []);

    // toggle category on or off when checkbox is clicked
    function handleCheckboxChange ({target}: {target: HTMLInputElement}) {
        const updatedCategories = selectedCategories.includes(target.value) 
        ? selectedCategories.filter(x => x !== target.value) 
        : [...selectedCategories, target.value];
        setSelectedCategories(updatedCategories);
    };
    
    return (
        <div className="category-filter panel">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <p className="eyebrow text-uppercase mb-1 text-muted">Project Types</p>
                    <h5 className="mb-0">Filter by category</h5>
                </div>
                <span className="badge bg-light text-dark">
                    {selectedCategories.length} selected
                </span>
            </div>
            <div className="category-list">
                {categories.map((c) => (
                    <div key={c} className="category-item">
                        <input 
                            type="checkbox" 
                            id={c} value={c} 
                            className="category-checkbox"
                            onChange={handleCheckboxChange}
                            checked={selectedCategories.includes(c)}
                        />
                        <label htmlFor={c}>{c}</label>
                    </div>
                ))}
            </div>

        </div>
    );
}

export default CategoryFilter;
