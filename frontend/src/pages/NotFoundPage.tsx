import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="hero-band error-page">
      <h1 className="error-page-code">404</h1>
      <h2 className="error-page-title">Page Not Found</h2>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <div className="hero-actions">
        <Link to="/" className="btn-hero-primary">Go Home</Link>
      </div>
    </div>
  );
}
