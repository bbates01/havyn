import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="hero-band" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '5rem', fontWeight: 800, marginBottom: '0.25rem' }}>401</h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Unauthorized</h2>
      <p>You must be signed in to view this page.</p>
      <div className="hero-actions">
        <Link to="/login" className="btn-hero-primary">Sign In</Link>
        <Link to="/" className="btn-hero-secondary">Go Home</Link>
      </div>
    </div>
  );
}
