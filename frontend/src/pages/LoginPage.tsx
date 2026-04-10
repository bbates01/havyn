import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  useEffect(() => {
    document.title = 'Log In | Havyn';
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get('email') ?? '').trim();
    const password = String(fd.get('password') ?? '');

    setLoading(true);
    try {
      await login(email, password);

      const user = await refreshAuth();

      if (user?.roles.includes('Admin')) {
        navigate('/admin');
      } else if (user?.roles.includes('Manager')) {
        navigate('/manager');
      } else if (user?.roles.includes('SocialWorker')) {
        navigate('/staff');
      } else if (user?.roles.includes('Donor')) {
        navigate('/donor');
      } else {
        navigate('/');
      }
    } catch {
      setError(
        'Sign-in could not be completed. Check your details or try again later.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Log in</h1>
        <p className="login-lede">
          Access your Havyn account to manage donations and preferences.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div
            className="login-feedback"
            role="status"
            aria-live="polite"
            id="login-feedback"
          >
            {error && (
              <span className="login-feedback--error">{error}</span>
            )}
          </div>
        </form>

        <p className="login-footer-note">
          New donor? <Link to="/signup">Create an account</Link>
          {' · '}
          Learn more on our <Link to="/">home page</Link>.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;