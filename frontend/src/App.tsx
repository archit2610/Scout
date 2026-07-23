import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChatApp from './pages/ChatApp';
import { ROUTES } from './lib/constants';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REGISTER} element={<Register />} />
            <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />

            {/* Chat Application Routes (ChatGPT / Claude Style Shell) */}
            <Route path={ROUTES.HOME} element={<ChatApp />} />
            <Route path={ROUTES.DASHBOARD} element={<ChatApp />} />
            <Route path={ROUTES.CONVERSATION} element={<ChatApp />} />
            <Route path={ROUTES.REPORT} element={<ChatApp />} />

            {/* Protected Routes (none for now, but keeping container if needed for other routes) */}
            <Route element={<ProtectedRoute />}>
            </Route>

            {/* Fallback Redirect */}
            <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
