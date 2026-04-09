import { useState, useEffect } from 'react';

const COOKIE_NAME = 'havyn_cookie_consent';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = getCookie(COOKIE_NAME);
    if (!existing) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    setCookie(COOKIE_NAME, 'accepted', 365);
    setVisible(false);
  };

  const handleDecline = () => {
    setCookie(COOKIE_NAME, 'declined', 365);
    setVisible(false);
  };

  const handleClose = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <p>
        We use cookies to improve your experience. You can accept all cookies or
        decline non-essential ones. Read our{' '}
        <a href="/privacy" style={{ color: 'var(--primary)', fontWeight: 600 }}>
          Privacy Policy
        </a>{' '}
        for more information.
      </p>
      <div className="cookie-banner-actions">
        <button className="cookie-btn cookie-btn-accept" onClick={handleAccept}>
          Accept
        </button>
        <button className="cookie-btn cookie-btn-decline" onClick={handleDecline}>
          Decline
        </button>
        <button
          className="cookie-btn-close"
          onClick={handleClose}
          aria-label="Close cookie banner"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
