import { Outlet } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import CookieConsentBanner from '../components/CookieConsentBanner';

function PublicLayout() {
  return (
    <div className="app-shell">
      <PublicNavbar />
      <main className="site-main">
        <Outlet />
      </main>
      <PublicFooter />
      <CookieConsentBanner />
    </div>
  );
}

export default PublicLayout;
