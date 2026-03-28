import { useEffect, useRef } from "react";
import { useCart } from "../context/CartContext";
import type { CartItem } from "../types/CartItem";

function CartDrawer () {
    const { cart, removeFromCart } = useCart();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const drawerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleHidden = () => {
            document.querySelectorAll('.offcanvas-backdrop').forEach((el) => el.remove());
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('paddingRight');
        };

        const drawer = drawerRef.current;
        drawer?.addEventListener('hidden.bs.offcanvas', handleHidden);
        return () => drawer?.removeEventListener('hidden.bs.offcanvas', handleHidden);
    }, []);

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex={-1}
            id="cartDrawer"
            aria-labelledby="cartDrawerLabel"
            ref={drawerRef}
        >
            <div className="offcanvas-header">
                <h5 className="offcanvas-title" id="cartDrawerLabel">
                    Your Cart
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close" />
            </div>

            <div className="offcanvas-body">
                {cart.length === 0 ? (
                    <p className="text-muted">Your cart is empty.</p>
                ) : (
                    <ul className="list-unstyled d-flex flex-column gap-3 mb-4">
                        {cart.map((item: CartItem) => (
                            <li key={item.bookId} className="p-3 border rounded">
                                <h5 className="mb-1">{item.title}</h5>
                                <div className="small text-muted mb-2">#{item.bookId}</div>
                                <p className="mb-1">Quantity: {item.quantity}</p>
                                <p className="mb-1">Price: ${item.price.toFixed(2)}</p>
                                <p className="fw-semibold">Subtotal: ${(item.price * item.quantity).toFixed(2)}</p>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => removeFromCart(item.bookId)}>
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted">Total</span>
                    <strong>{`$${subtotal.toFixed(2)}`}</strong>
                </div>

                <div className="d-grid gap-2">
                    <button className="btn btn-primary">Checkout</button>
                    <button className="btn btn-secondary" data-bs-dismiss="offcanvas">
                        Continue browsing
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CartDrawer;
