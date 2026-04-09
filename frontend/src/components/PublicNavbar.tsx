import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="public-navbar">
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
      </nav>
    </header>
  );
}

export default PublicNavbar;
