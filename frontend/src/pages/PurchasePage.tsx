import { useNavigate, useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import type { CartItem } from "../types/CartItem";

// page for confirming book purchase before adding to cart
function PurchasePage() {
    const navigate = useNavigate();
    const {title, bookId, price} = useParams();
    const { addToCart } = useCart();

    // add book to cart and return to books page with confirmation toast
    const handleAddToCart = () => {
        // create cart item from url params
        const newItem: CartItem = {
            bookId: Number(bookId),
            title: title || "No Book Found",
            price: Number(price),
            quantity: 1
        };
        addToCart(newItem);

        // show confirmation mesage when returning to books page
        const toastMessage = `${newItem.title} added to cart!`;
        navigate('/books', { state: { toastMessage } });
    };

    return (

        <>
            <h2>Add {title} to cart</h2>

            <div>
                <p>
                    Price: ${price}
                </p>
                <div className="d-flex flex-wrap gap-2 mt-3">
                    <button className="btn btn-primary" onClick={handleAddToCart}>Add to cart</button>
                    <button className="btn btn-danger" onClick={() => navigate(-1)}>Go Back</button>
                </div>
            </div>

        </>
    );
}

export default PurchasePage;
