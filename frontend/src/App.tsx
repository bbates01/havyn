import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import PublicLayout from './layouts/PublicLayout';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DonorImpactPage = lazy(() => import('./pages/DonorImpactPage'));
const ApiTestPage = lazy(() => import('./pages/ApiTestPage'));

function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <span className="visually-hidden">Loading page</span>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public routes with shared navbar / footer */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/donor-impact" element={<DonorImpactPage />} />
            <Route path="/api-test" element={<ApiTestPage />} />
          </Route>
          {/* Authenticated dashboard routes will be added here */}
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
