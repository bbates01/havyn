import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PublicFooter() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <footer className="public-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <h3>Havyn</h3>
          <p>
            Providing safe homes and brighter futures for girls who are survivors
            of abuse and trafficking in the Philippines. Every child deserves
            safety, healing, and hope.
          </p>
        </div>

        <div className="footer-links">
          <h4>Navigate</h4>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/donor-impact">Donor Impact</Link>
            </li>
            {!loading && !isAuthenticated && (
              <li>
                <Link to="/login">Log In</Link>
              </li>
            )}
          </ul>
        </div>

        <div className="footer-links">
          <h4>Legal</h4>
          <ul>
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
