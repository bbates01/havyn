import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="hero-band" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '5rem', fontWeight: 800, marginBottom: '0.25rem' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Page Not Found</h2>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <div className="hero-actions">
        <Link to="/" className="btn-hero-primary">Go Home</Link>
      </div>
    </div>
  );
}
