import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

function DonorHomePage() {
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    document.title = 'Donor home | Havyn';
  }, []);

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <p className="login-lede" style={{ marginBottom: 0 }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.roles.includes('Donor')) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Donor area</h1>
          <p className="login-lede">
            This page is for donor accounts. You can continue to the public site
            or log in with a donor profile.
          </p>
          <p className="login-footer-note" style={{ borderTop: 'none', paddingTop: 0 }}>
            <Link to="/">Home</Link>
            {' · '}
            <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card login-card--signup">
        <h1>Welcome</h1>
        <p className="login-lede">
          You are signed in{user.email ? ` as ${user.email}` : ''}. Thank you for
          supporting Havyn.
        </p>
        <p className="login-footer-note" style={{ borderTop: 'none', paddingTop: 0 }}>
          <Link to="/donor-impact">Donor impact</Link>
          {' · '}
          <Link to="/">Home</Link>
        </p>
      </div>
    </div>
  );
}

export default DonorHomePage;
