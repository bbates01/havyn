import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { login, verifyMfa, verifyRecoveryCode } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshAuth } = useAuth();

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const fromDonate = searchParams.get('from') === 'donate';
  const showDonateBanner = fromDonate && !bannerDismissed;

  useEffect(() => {
    document.title = 'Log In | Havyn';
  }, []);

  const completeLogin = async () => {
    const user = await refreshAuth();
    if (!user?.isAuthenticated) {
      setError('Session could not be established.');
      return;
    }
    if (user.roles.includes('Admin')) navigate('/admin');
    else if (user.roles.includes('Manager')) navigate('/manager');
    else if (user.roles.includes('SocialWorker')) navigate('/staff');
    else if (user.roles.includes('Donor')) navigate('/donor/dashboard');
    else navigate('/');
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get('email') ?? '').trim();
    const password = String(fd.get('password') ?? '');

    setLoading(true);
    try {
      const data = await login(email, password, rememberMe);

      if (data.requiresMfa) {
        setMfaRequired(true);
        return;
      }

      await completeLogin();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Sign-in could not be completed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (useRecoveryCode) {
        await verifyRecoveryCode(mfaCode, rememberMe);
      } else {
        await verifyMfa(mfaCode, rememberMe);
      }
      await completeLogin();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Verification failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (mfaRequired) {
    return (
      <div className="login-page">
        <div className="login-stack">
          {showDonateBanner && (
            <div className="login-donate-banner" role="status" aria-live="polite">
              <span className="login-donate-banner-icon" aria-hidden="true">ℹ</span>
              <p>
                To complete your donation, please log in to your Havyn account
                or create a free account below. Donor accounts allow us to send
                your tax receipt and track your giving history.
              </p>
              <button
                type="button"
                className="login-donate-banner-close"
                onClick={() => setBannerDismissed(true)}
                aria-label="Dismiss donation info"
              >
                ×
              </button>
            </div>
          )}
          <div className="login-card">
          <h1>Two-Factor Authentication</h1>
          <p className="login-lede">
            {useRecoveryCode
              ? 'Enter one of your recovery codes.'
              : 'Enter the 6-digit code from your authenticator app.'}
          </p>

          <form className="login-form" onSubmit={handleMfaVerify}>
            <div className="login-field">
              <label htmlFor="mfa-code">
                {useRecoveryCode ? 'Recovery code' : 'Verification code'}
              </label>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={useRecoveryCode ? 'Recovery code' : '000 000'}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                maxLength={useRecoveryCode ? 20 : 7}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={loading || mfaCode.length < 6}
              aria-busy={loading}
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>

            <div
              className="login-feedback"
              role="status"
              aria-live="polite"
            >
              {error && (
                <span className="login-feedback--error">{error}</span>
              )}
            </div>
          </form>

          <p className="login-footer-note">
            <button
              type="button"
              className="login-link-btn"
              onClick={() => {
                setUseRecoveryCode(!useRecoveryCode);
                setMfaCode('');
                setError(null);
              }}
            >
              {useRecoveryCode
                ? 'Use authenticator code instead'
                : 'Use a recovery code instead'}
            </button>
          </p>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-stack">
        {showDonateBanner && (
          <div className="login-donate-banner" role="status" aria-live="polite">
            <span className="login-donate-banner-icon" aria-hidden="true">ℹ</span>
            <p>
              To complete your donation, please log in to your Havyn account or
              create a free account below. Donor accounts allow us to send your
              tax receipt and track your giving history.
            </p>
            <button
              type="button"
              className="login-donate-banner-close"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss donation info"
            >
              ×
            </button>
          </div>
        )}
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
            <div className="password-input-wrap">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="Enter your password"
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

          <label className="login-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>

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
    </div>
  );
}

export default LoginPage;
