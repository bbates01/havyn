import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StaffCreateUserPage = lazy(() => import('./pages/StaffCreateUserPage'));
const ResidentIntakePage = lazy(() => import('./pages/ResidentIntakePage'));
const FormsPage = lazy(() => import('./pages/FormsPage'));

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
                <Route path="/admin/residents/new" element={<ResidentIntakePage />} />
                <Route path="/admin/residents/:id/edit" element={<ResidentIntakePage />} />
                <Route path="/admin/forms" element={<FormsPage />} />
                <Route path="/admin/forms/process-recording/:id/edit" element={<FormsPage />} />
                <Route path="/admin/forms/process-recording" element={<Navigate to="/admin/forms" replace />} />
                <Route path="/admin/forms/home-visitation/:id/edit" element={<FormsPage />} />
                <Route path="/admin/forms/home-visitation" element={<Navigate to="/admin/forms" replace />} />
                <Route path="/admin/forms/intervention-plan/:id/edit" element={<FormsPage />} />
                <Route path="/admin/forms/intervention-plan" element={<Navigate to="/admin/forms" replace />} />
                <Route path="/admin/forms/incident-report/:id/edit" element={<FormsPage />} />
                <Route path="/admin/forms/incident-report" element={<Navigate to="/admin/forms" replace />} />
                <Route path="/admin/forms/health-wellbeing/:id/edit" element={<FormsPage />} />
                <Route path="/admin/forms/health-wellbeing" element={<Navigate to="/admin/forms" replace />} />
                <Route path="/admin/forms/education-record/:id/edit" element={<FormsPage />} />
                <Route path="/admin/forms/education-record" element={<Navigate to="/admin/forms" replace />} />
                <Route path="/admin/reports" element={<ReportsPage />} />
                <Route path="/manager" element={<DashboardPage />} />
                <Route path="/manager/reports" element={<ReportsPage />} />
                <Route path="/admin/create-user" element={<StaffCreateUserPage />} />
                <Route path="/manager/caseload" element={<CaseloadPage />} />
                <Route path="/manager/residents/new" element={<ResidentIntakePage />} />
                <Route path="/manager/residents/:id/edit" element={<ResidentIntakePage />} />
                <Route path="/manager/forms" element={<FormsPage />} />
                <Route path="/manager/forms/process-recording/:id/edit" element={<FormsPage />} />
                <Route path="/manager/forms/process-recording" element={<Navigate to="/manager/forms" replace />} />
                <Route path="/manager/forms/home-visitation/:id/edit" element={<FormsPage />} />
                <Route path="/manager/forms/home-visitation" element={<Navigate to="/manager/forms" replace />} />
                <Route path="/manager/forms/intervention-plan/:id/edit" element={<FormsPage />} />
                <Route path="/manager/forms/intervention-plan" element={<Navigate to="/manager/forms" replace />} />
                <Route path="/manager/forms/incident-report/:id/edit" element={<FormsPage />} />
                <Route path="/manager/forms/incident-report" element={<Navigate to="/manager/forms" replace />} />
                <Route path="/manager/forms/health-wellbeing/:id/edit" element={<FormsPage />} />
                <Route path="/manager/forms/health-wellbeing" element={<Navigate to="/manager/forms" replace />} />
                <Route path="/manager/forms/education-record/:id/edit" element={<FormsPage />} />
                <Route path="/manager/forms/education-record" element={<Navigate to="/manager/forms" replace />} />
                <Route path="/manager/create-user" element={<StaffCreateUserPage />} />
                <Route path="/staff" element={<DashboardPage />} />
                <Route path="/staff/caseload" element={<CaseloadPage />} />
                <Route path="/staff/forms" element={<FormsPage />} />
                <Route path="/staff/forms/process-recording/:id/edit" element={<FormsPage />} />
                <Route path="/staff/forms/process-recording" element={<Navigate to="/staff/forms" replace />} />
                <Route path="/staff/forms/home-visitation/:id/edit" element={<FormsPage />} />
                <Route path="/staff/forms/home-visitation" element={<Navigate to="/staff/forms" replace />} />
                <Route path="/staff/forms/intervention-plan/:id/edit" element={<FormsPage />} />
                <Route path="/staff/forms/intervention-plan" element={<Navigate to="/staff/forms" replace />} />
                <Route path="/staff/forms/incident-report/:id/edit" element={<FormsPage />} />
                <Route path="/staff/forms/incident-report" element={<Navigate to="/staff/forms" replace />} />
                <Route path="/staff/forms/health-wellbeing/:id/edit" element={<FormsPage />} />
                <Route path="/staff/forms/health-wellbeing" element={<Navigate to="/staff/forms" replace />} />
                <Route path="/staff/forms/education-record/:id/edit" element={<FormsPage />} />
                <Route path="/staff/forms/education-record" element={<Navigate to="/staff/forms" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/caseload" element={<CaseloadPage />} />
                <Route path="/dashboard/forms" element={<FormsPage />} />
                <Route path="/dashboard/forms/process-recording/:id/edit" element={<FormsPage />} />
                <Route path="/dashboard/forms/process-recording" element={<Navigate to="/dashboard/forms" replace />} />
                <Route path="/dashboard/forms/home-visitation/:id/edit" element={<FormsPage />} />
                <Route path="/dashboard/forms/home-visitation" element={<Navigate to="/dashboard/forms" replace />} />
                <Route path="/dashboard/forms/intervention-plan/:id/edit" element={<FormsPage />} />
                <Route path="/dashboard/forms/intervention-plan" element={<Navigate to="/dashboard/forms" replace />} />
                <Route path="/dashboard/forms/incident-report/:id/edit" element={<FormsPage />} />
                <Route path="/dashboard/forms/incident-report" element={<Navigate to="/dashboard/forms" replace />} />
                <Route path="/dashboard/forms/health-wellbeing/:id/edit" element={<FormsPage />} />
                <Route path="/dashboard/forms/health-wellbeing" element={<Navigate to="/dashboard/forms" replace />} />
                <Route path="/dashboard/forms/education-record/:id/edit" element={<FormsPage />} />
                <Route path="/dashboard/forms/education-record" element={<Navigate to="/dashboard/forms" replace />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;