import { Link, useLocation } from 'react-router-dom';

function PublicFooter() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return null;
  }

  return (
    <footer className="public-footer no-print">
      <h2 className="footer-title">Learn More About Us</h2>
      <div className="footer-grid">
        <div className="footer-links">
          <h4>About Us</h4>
          <ul>
            <li>
              <Link to="/about#about-who-title">Who We Are</Link>
            </li>
            <li>
              <Link to="/about#about-do-title">What We Do</Link>
            </li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Impact</h4>
          <ul>
            <li>
              <Link to="/donor">Donor Impact</Link>
            </li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Resources</h4>
          <ul>
            <li>
              <Link to="/faq">Donor FAQ</Link>
            </li>
            <li>
              <a href="mailto:havyn.support@havyn.org">havyn.support@havyn.org</a>
            </li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Quick Links</h4>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/donor">Donate</Link>
            </li>
            <li>
              <Link to="/privacy">Privacy Policy</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <small>&copy; {new Date().getFullYear()} Havyn. All rights reserved.</small>
      </div>
    </footer>
  );
}

export default PublicFooter;
