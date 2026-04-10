import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import PublicLayout from './layouts/PublicLayout';
import ProtectedRoute from './components/ProtectedRoute';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const DonorHomePage = lazy(() => import('./pages/DonorHomePage'));
const DonorImpactPage = lazy(() => import('./pages/DonorImpactPage'));
const ApiTestPage = lazy(() => import('./pages/ApiTestPage'));
const MlTestPage = lazy(() => import('./pages/MlTestPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const CaseloadPage = lazy(() => import('./pages/CaseloadPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const DonorsPage = lazy(() => import('./pages/DonorsPage'));
const PartnersPage = lazy(() => import('./pages/PartnersPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StaffCreateUserPage = lazy(() => import('./pages/StaffCreateUserPage'));

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
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/donor" element={<DonorHomePage />} />
              <Route path="/donor-impact" element={<DonorImpactPage />} />
              <Route path="/api-test" element={<ApiTestPage />} />
              <Route path="/ml-test" element={<MlTestPage />} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route element={<DashboardLayout />}>
                <Route path="/admin" element={<DashboardPage />} />
                <Route path="/admin/caseload" element={<CaseloadPage />} />
                <Route path="/admin/donors" element={<DonorsPage />} />
                <Route path="/admin/reports" element={<ReportsPage />} />
                <Route path="/admin/partners" element={<PartnersPage />} />
                <Route path="/manager" element={<DashboardPage />} />
                <Route path="/manager/caseload" element={<CaseloadPage />} />
                <Route path="/manager/donors" element={<DonorsPage />} />
                <Route path="/manager/partners" element={<PartnersPage />} />
                <Route path="/manager/reports" element={<ReportsPage />} />
                <Route path="/admin/create-user" element={<StaffCreateUserPage />} />
                <Route path="/manager/create-user" element={<StaffCreateUserPage />} />
                <Route path="/staff" element={<DashboardPage />} />
                <Route path="/staff/caseload" element={<CaseloadPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/caseload" element={<CaseloadPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;