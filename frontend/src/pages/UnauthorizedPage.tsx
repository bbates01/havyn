import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="hero-band error-page">
      <h1 className="error-page-code">401</h1>
      <h2 className="error-page-title">Unauthorized</h2>
      <p>You must be signed in to view this page.</p>
      <div className="hero-actions">
        <Link to="/login" className="btn-hero-primary">Sign In</Link>
        <Link to="/" className="btn-hero-secondary">Go Home</Link>
      </div>
    </div>
  );
}
