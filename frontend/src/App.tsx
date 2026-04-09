import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import PublicLayout from './layouts/PublicLayout';
import LandingPage from './pages/LandingPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import LoginPage from './pages/LoginPage';
import DonorImpactPage from './pages/DonorImpactPage';
import ApiTestPage from './pages/ApiTestPage';

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;
