import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getMfaStatus,
  setupMfa,
  enableMfa,
  disableMfa,
  type MfaStatus,
  type MfaSetup,
} from '../api/authApi';
import './SettingsPage.css';

type MfaStep = 'status' | 'setup' | 'recovery' | 'disable';

export default function SettingsPage() {
  const { user } = useAuth();

  // MFA state
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [mfaSetup, setMfaSetup] = useState<MfaSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [mfaMessage, setMfaMessage] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaStep, setMfaStep] = useState<MfaStep>('status');

  useEffect(() => {
    document.title = 'Settings | Havyn';
    loadMfaStatus();
  }, []);

  const loadMfaStatus = async () => {
    try {
      setMfaStatus(await getMfaStatus());
    } catch {
      setMfaError('Failed to load MFA status.');
    }
  };

  const handleStartSetup = async () => {
    setMfaError('');
    setMfaLoading(true);
    try {
      setMfaSetup(await setupMfa());
      setMfaStep('setup');
    } catch {
      setMfaError('Failed to generate authenticator key.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError('');
    setMfaLoading(true);
    try {
      const result = await enableMfa(verificationCode);
      setRecoveryCodes(result.recoveryCodes);
      setMfaMessage(result.message);
      setMfaStep('recovery');
      await loadMfaStatus();
    } catch (err: unknown) {
      setMfaError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError('');
    setMfaLoading(true);
    try {
      const result = await disableMfa(disablePassword);
      setMfaMessage(result.message);
      setDisablePassword('');
      setMfaStep('status');
      await loadMfaStatus();
    } catch (err: unknown) {
      setMfaError(err instanceof Error ? err.message : 'Failed to disable MFA.');
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        {/* ── Account Info ── */}
        <div className="settings-card">
          <h2>Account</h2>
          <div className="settings-info-row">
            <span className="settings-info-label">Email</span>
            <span className="settings-info-value">{user?.email ?? '—'}</span>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-label">Display name</span>
            <span className="settings-info-value">{user?.userName ?? '—'}</span>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-label">Role</span>
            <span className="settings-info-value">
              {user?.roles.length
                ? user.roles.map((r) => (
                    <span key={r} className="settings-role-badge">{r}</span>
                  ))
                : '—'}
            </span>
          </div>
        </div>

        {/* ── Two-Factor Authentication ── */}
        <div className="settings-card">
          <h2>Two-Factor Authentication</h2>

          {mfaMessage && <div className="mfa-message mfa-message--success">{mfaMessage}</div>}
          {mfaError && <div className="mfa-message mfa-message--error">{mfaError}</div>}

          {!mfaStatus && <p>Loading MFA settings…</p>}

          {mfaStatus && mfaStep === 'status' && (
            <div>
              <p className="mfa-status-text">
                MFA is currently <strong>{mfaStatus.isMfaEnabled ? 'enabled' : 'disabled'}</strong>.
              </p>
              {mfaStatus.isMfaEnabled ? (
                <button className="mfa-btn" onClick={() => { setMfaMessage(''); setMfaError(''); setMfaStep('disable'); }}>
                  Disable MFA
                </button>
              ) : (
                <button className="mfa-btn" onClick={handleStartSetup} disabled={mfaLoading}>
                  {mfaLoading ? 'Setting up…' : 'Enable MFA'}
                </button>
              )}
            </div>
          )}

          {mfaStep === 'setup' && mfaSetup && (
            <div>
              <h3>Step 1: Scan QR Code</h3>
              <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):</p>
              <img className="mfa-qr" src={mfaSetup.qrCodeDataUri} alt="MFA QR Code" />
              <p className="mfa-manual-key">
                Can't scan? Enter this key manually: <code>{mfaSetup.sharedKey}</code>
              </p>

              <h3>Step 2: Verify</h3>
              <p>Enter the 6-digit code from your authenticator app to confirm setup:</p>
              <form onSubmit={handleEnable}>
                <div className="mfa-field">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000 000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={7}
                    autoFocus
                  />
                </div>
                <div className="mfa-actions">
                  <button className="mfa-btn" type="submit" disabled={mfaLoading || verificationCode.length < 6}>
                    {mfaLoading ? 'Verifying…' : 'Verify & Enable'}
                  </button>
                  <button className="mfa-btn--link" type="button" onClick={() => { setMfaStep('status'); setMfaSetup(null); setVerificationCode(''); setMfaError(''); }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {mfaStep === 'recovery' && recoveryCodes.length > 0 && (
            <div>
              <h3>Save Your Recovery Codes</h3>
              <p>
                Store these codes somewhere safe. Each code can only be used once.
                If you lose access to your authenticator app, you'll need one of
                these to sign in.
              </p>
              <div className="mfa-recovery-codes">
                {recoveryCodes.map((code, i) => (
                  <div key={i}>{code}</div>
                ))}
              </div>
              <div className="mfa-actions">
                <button
                  className="mfa-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(recoveryCodes.join('\n'));
                    setMfaMessage('Recovery codes copied to clipboard.');
                  }}
                >
                  Copy to Clipboard
                </button>
                <button className="mfa-btn mfa-btn--secondary" onClick={() => { setMfaStep('status'); setRecoveryCodes([]); setVerificationCode(''); }}>
                  I've Saved My Codes — Done
                </button>
              </div>
            </div>
          )}

          {mfaStep === 'disable' && (
            <div>
              <h3>Disable MFA</h3>
              <p>Enter your password to disable two-factor authentication.</p>
              <form onSubmit={handleDisable}>
                <div className="mfa-field">
                  <input
                    type="password"
                    placeholder="Password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    required
                  />
                </div>
                <div className="mfa-actions">
                  <button className="mfa-btn" type="submit" disabled={mfaLoading}>
                    {mfaLoading ? 'Disabling…' : 'Disable MFA'}
                  </button>
                  <button className="mfa-btn--link" type="button" onClick={() => { setMfaStep('status'); setDisablePassword(''); setMfaError(''); }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
