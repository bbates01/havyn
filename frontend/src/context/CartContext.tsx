import { createContext, useContext, useState, type ReactNode } from "react";
import type { CartItem } from "../types/CartItem";

// interface for the cart context api
interface CartContextType {
    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (bookId: number) => void;
    clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// provider component to wrap app with cart state
export const CartProvider = ({ children }: {children: ReactNode}) => {
    const [cart, setCart] = useState<CartItem[]>([]);

    // add new item or increment quantitiy if it already exists
    const addToCart = (item: CartItem) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((c) => c.bookId === item.bookId);

            if (existingItem) {
                return prevCart.map((c) =>
                    c.bookId === item.bookId
                        ? { ...c, quantity: c.quantity + item.quantity }
                        : c
                );
            }

            return [...prevCart, item];
        });
    };
    // remove item from cart by id
    const removeFromCart = (bookId: number) => {
        setCart((prevCart) => prevCart.filter((c) => c.bookId !== bookId));
    };

    // empty cart completely
    const clearCart = () => {
        setCart(() => []);
    };

    return (
        <CartContext.Provider
            value={{cart, addToCart, removeFromCart, clearCart }}
        >
            { children }
        </CartContext.Provider>
    );
};

// custom hook to access cart context throughout app
export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};
