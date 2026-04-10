import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, verifyMfa, verifyRecoveryCode } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

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
    else if (user.roles.includes('Donor')) navigate('/donor');
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
    );
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
          New to Havyn? Learn more on our <Link to="/">home page</Link>.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
