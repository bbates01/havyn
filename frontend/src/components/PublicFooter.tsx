import { Link, useLocation } from 'react-router-dom';

function PublicFooter() {
  const location = useLocation();
  const hideFooterTitle = location.pathname === '/login';

  return (
    <footer className="public-footer">
      {!hideFooterTitle && <h2 className="footer-title">Learn More About Us</h2>}
      <div className="footer-grid">
        <div className="footer-links">
          <h4>About Us</h4>
          <ul>
            <li><span>Who We Are</span></li>
            <li><span>Our History</span></li>
            <li><span>What We Believe</span></li>
            <li><span>What We Do</span></li>
            <li><span>Leadership</span></li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Programs</h4>
          <ul>
            <li><span>Safe Homes</span></li>
            <li><span>Healing Services</span></li>
            <li><span>Education Support</span></li>
            <li><span>Legal Advocacy</span></li>
            <li><span>Family Reintegration</span></li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Impact</h4>
          <ul>
            <li>
              <Link to="/donor-impact">Donor Impact</Link>
            </li>
            <li><span>Stories of Hope</span></li>
            <li><span>Annual Results</span></li>
            <li><span>Global Supporters</span></li>
            <li><span>Partner Network</span></li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Resources</h4>
          <ul>
            <li><span>Newsroom</span></li>
            <li><span>Events</span></li>
            <li><span>Volunteer Guide</span></li>
            <li><span>Donor FAQ</span></li>
            <li><span>Contact Support</span></li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Quick Links</h4>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/login">Donate</Link>
            </li>
            <li>
              <Link to="/privacy">Privacy Policy</Link>
            </li>
            <li><span>Terms of Use</span></li>
            <li><span>Safeguarding Policy</span></li>
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
