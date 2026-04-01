import { useCart } from "../context/CartContext";

// displays cart total and item count in header
const CartSummary = () => {
    const { cart } = useCart();
    // calculate cart totals for display
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    return (
        <button
            type="button"
            className="cart-pill"
            data-bs-toggle="offcanvas"
            data-bs-target="#cartDrawer"
            aria-controls="cartDrawer"
            aria-label={`View cart with ${itemCount} items`}
        >
            <span role="img" aria-hidden="true"><strong>Cart</strong></span>
            <div className="text-start">
                {`$${totalAmount.toFixed(2)}`}
            </div>
        </button>
    );
}

export default CartSummary;
