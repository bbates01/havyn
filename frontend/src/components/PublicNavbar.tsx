import { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';

function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className={`public-navbar${isHome ? ' navbar-overlay' : ''}`}>
      <Link to="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
        <div className="navbar-brand-icon">H</div>
        <span className="navbar-brand-text">Havyn</span>
      </Link>

      <button
        className="navbar-toggler"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
      >
        {menuOpen ? '\u2715' : '\u2630'}
      </button>

      <nav className={`navbar-collapse${menuOpen ? ' open' : ''}`}>
        <ul className="navbar-links">
          <li>
            <NavLink to="/" onClick={() => setMenuOpen(false)}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/about" onClick={() => setMenuOpen(false)}>
              About
            </NavLink>
          </li>
          <li>
            <NavLink to="/donor-impact" onClick={() => setMenuOpen(false)}>
              Donor Impact
            </NavLink>
          </li>
          <li>
            <NavLink to="/privacy" onClick={() => setMenuOpen(false)}>
              Privacy Policy
            </NavLink>
          </li>
          <li>
            <NavLink to="/login" onClick={() => setMenuOpen(false)}>
              Log In
            </NavLink>
          </li>
        </ul>
        <Link
          to="/login"
          className="navbar-donate"
          onClick={() => setMenuOpen(false)}
        >
          Donate
        </Link>
      </nav>
    </header>
  );
}

export default PublicNavbar;
