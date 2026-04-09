import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
// Bootstrap is loaded only on /api-test (see ApiTestPage) to keep other routes lighter.

// render main app component in root element
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
