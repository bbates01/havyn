import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import './App.css';
import { CartProvider } from './context/CartContext';
import BooksPage from './pages/BooksPage';
import CartDrawer from './pages/CartPage';
import PurchasePage from './pages/PurchasePage';
import CartSummary from './components/CartSummary';

function App() {
  return (
    <CartProvider>
      <Router>
        <div className="app-shell">
          <header className="site-header">
            <div className="brand">
              <div className="brand-icon">MB</div>
              <div>
                <p className="eyebrow text-muted mb-1">Mission 12 Bookstore</p>
              </div>
            </div>
            <nav className="main-nav" aria-label="Primary Navigation">
              <NavLink to="/" end>
                Books
              </NavLink>
              <CartSummary />
            </nav>
          </header>

          <main className="site-main">
            <Routes>
              <Route path="/" element={<BooksPage />} />
              <Route path="/books" element={<BooksPage />} />
              <Route path="/purchase/:title/:bookId/:price" element={<PurchasePage />} />
            </Routes>
          </main>

          <footer className="site-footer">
            <small>© {new Date().getFullYear()} Mission 12 Bookstore · Built with React & Bootstrap</small>
          </footer>
          
          {/* toast container for pop-up notification */}
          <div className="toast-container position-fixed bottom-0 end-0 p-3">
            <div
              id="cartToast"
              className="toast"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              <div className="toast-header">
                <strong className="me-auto">Cart updated</strong>
                <button type="button" className="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
              </div>
              <div className="toast-body" id="cartToastBody">
                {/* Filled at runtime */}
              </div>
            </div>
          </div>

          <CartDrawer />
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;
