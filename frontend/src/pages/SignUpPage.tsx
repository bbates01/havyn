import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

function SignUpPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supporterType, setSupporterType] = useState('Individual');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  useEffect(() => {
    document.title = 'Create account | Havyn';
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const password = String(fd.get('password') ?? '');
    const confirm = String(fd.get('confirmPassword') ?? '');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    const email = String(fd.get('email') ?? '').trim();
    const firstName = String(fd.get('firstName') ?? '').trim();
    const lastName = String(fd.get('lastName') ?? '').trim();
    const phone = String(fd.get('phone') ?? '').trim();
    const region = String(fd.get('region') ?? '').trim();
    const country = String(fd.get('country') ?? '').trim();
    const organizationName = String(fd.get('organizationName') ?? '').trim();

    const payload = {
      email,
      password,
      firstName,
      lastName,
      phone,
      region,
      country,
      supporterType,
      ...(supporterType === 'Organization' && organizationName
        ? { organizationName }
        : {}),
    };

    setLoading(true);
    try {
      await register(payload);
      await refreshAuth();
      navigate('/donor');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not create account. Try again or use a different email.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card login-card--signup">
        <h1>Create donor account</h1>
        <p className="login-lede">
          Your details are saved to your supporter profile. Passwords must be at
          least 12 characters and include upper and lower case letters, a
          number, and a symbol.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="signup-type">I am signing up as</label>
            <select
              id="signup-type"
              value={supporterType}
              onChange={(ev) => setSupporterType(ev.target.value)}
              aria-label="Supporter type"
            >
              <option value="Individual">Individual</option>
              <option value="Organization">Organization</option>
            </select>
          </div>

          {supporterType === 'Organization' && (
            <div className="login-field">
              <label htmlFor="signup-org">Organization name</label>
              <input
                id="signup-org"
                name="organizationName"
                type="text"
                autoComplete="organization"
                required
                placeholder="Organization name"
              />
            </div>
          )}

          <div className="login-field">
            <label htmlFor="signup-first">First name</label>
            <input
              id="signup-first"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              placeholder="First name"
            />
          </div>
          <div className="login-field">
            <label htmlFor="signup-last">Last name</label>
            <input
              id="signup-last"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              placeholder="Last name"
            />
          </div>
          <div className="login-field">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="login-field">
            <label htmlFor="signup-phone">Phone</label>
            <input
              id="signup-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              placeholder="Phone number"
            />
          </div>
          <div className="login-field">
            <label htmlFor="signup-region">Region / state</label>
            <input
              id="signup-region"
              name="region"
              type="text"
              autoComplete="address-level1"
              required
              placeholder="e.g. Utah"
            />
          </div>
          <div className="login-field">
            <label htmlFor="signup-country">Country</label>
            <input
              id="signup-country"
              name="country"
              type="text"
              autoComplete="country-name"
              required
              placeholder="e.g. United States"
            />
          </div>
          <div className="login-field">
            <label htmlFor="signup-password">Password</label>
            <div className="password-input-wrap">
              <input
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={12}
                placeholder="Create a password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M10.6 10.7a2 2 0 002.7 2.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M9.9 5.2A10.7 10.7 0 0112 5c5.3 0 9.4 4.2 10 7-.2.9-.8 2-1.8 3.1M6.1 6.2C4 7.6 2.5 9.5 2 12c.8 3.3 4.8 7 10 7 1.8 0 3.5-.4 5-1.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M2 12c.8-3.3 4.8-7 10-7s9.2 3.7 10 7c-.8 3.3-4.8 7-10 7S2.8 15.3 2 12z" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="login-field">
            <label htmlFor="signup-confirm">Confirm password</label>
            <div className="password-input-wrap">
              <input
                id="signup-confirm"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={12}
                placeholder="Confirm password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M10.6 10.7a2 2 0 002.7 2.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M9.9 5.2A10.7 10.7 0 0112 5c5.3 0 9.4 4.2 10 7-.2.9-.8 2-1.8 3.1M6.1 6.2C4 7.6 2.5 9.5 2 12c.8 3.3 4.8 7 10 7 1.8 0 3.5-.4 5-1.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M2 12c.8-3.3 4.8-7 10-7s9.2 3.7 10 7c-.8 3.3-4.8 7-10 7S2.8 15.3 2 12z" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <div
            className="login-feedback"
            role="status"
            aria-live="polite"
            id="signup-feedback"
          >
            {error && (
              <span className="login-feedback--error">{error}</span>
            )}
          </div>
        </form>

        <p className="login-footer-note">
          Already have an account? <Link to="/login">Log in</Link>.
        </p>
      </div>
    </div>
  );
}

export default SignUpPage;
