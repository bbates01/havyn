import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, loading, logoutUser, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    setMenuOpen(false);
    await logoutUser();
    navigate('/');
  }

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

      <nav className={`navbar-collapse${menuOpen ? ' open' : ''}`} style={{ flex: 1 }}>
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
            <NavLink end to="/donor" onClick={() => setMenuOpen(false)}>
              Donor Impact
            </NavLink>
          </li>
          <li>
            <NavLink to="/privacy" onClick={() => setMenuOpen(false)}>
              Privacy Policy
            </NavLink>
          </li>
          <li>
            <NavLink to="/faq" onClick={() => setMenuOpen(false)}>
              FAQ
            </NavLink>
          </li>
          {!loading && isAuthenticated && (
            <>
              <li>
                <NavLink
                  to={
                    user?.roles.includes('Admin') ? '/admin'
                      : user?.roles.includes('Manager') ? '/manager'
                        : user?.roles.includes('SocialWorker') ? '/staff'
                          : '/dashboard'
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  Tools
                </NavLink>
              </li>
              <li>
                <NavLink to="/settings" onClick={() => setMenuOpen(false)}>
                  Settings
                </NavLink>
              </li>
            </>
          )}
        </ul>
        {!loading && (
          <ul className="navbar-links" style={{ marginLeft: 'auto' }}>
            <li>
              {isAuthenticated ? (
                <button
                  type="button"
                  className="navbar-logout-btn"
                  onClick={handleLogout}
                >
                  Log Out
                </button>
              ) : (
                <NavLink to="/login" onClick={() => setMenuOpen(false)}>
                  Log In
                </NavLink>
              )}
            </li>
          </ul>
        )}
      </nav>
    </header>
  );
}

export default PublicNavbar;
