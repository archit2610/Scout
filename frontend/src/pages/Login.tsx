import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  // URL param banners
  const verified = searchParams.get('verified') === 'true';
  const tokenError = searchParams.get('error') === 'invalid_token';
  const loggedOut = searchParams.has('logged_out');
  const passwordReset = searchParams.get('reset') === 'true';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setShowResend(false);

    if (!email.trim()) { setErrors({ email: 'Email is required' }); return; }
    if (!password) { setErrors({ password: 'Password is required' }); return; }

    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        if (res.message?.toLowerCase().includes('verify your email')) {
          setErrors({ general: res.message });
          setShowResend(true);
        } else {
          setErrors({ general: res.message || 'Login failed' });
        }
      }
    } catch (err: any) {
      setErrors({ general: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResendStatus('Sending...');
      await api.post('/api/v1/resend-emailverification', { email });
      setResendStatus('Verification email sent!');
    } catch (err: any) {
      setResendStatus(err.message || 'Failed to send. Try again.');
    }
  };

  return (
    <div className="min-h-screen bg-scout-dark flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 -left-32 w-96 h-96 bg-cyan-600/8 rounded-full blur-[120px]" />

      <div className="auth-card animate-fade-in relative z-10">
        <h1
          className="text-3xl text-white mb-2 tracking-tight text-center"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Welcome back
        </h1>
        <p className="text-white/40 text-sm text-center mb-8">
          Sign in to continue your research
        </p>

        {/* URL param banners */}
        {verified && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-6">
            <p className="text-emerald-400 text-sm">Email verified successfully. Please sign in.</p>
          </div>
        )}
        {tokenError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">
            <p className="text-red-400 text-sm">Invalid or expired verification link.</p>
          </div>
        )}
        {loggedOut && (
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6">
            <p className="text-white/60 text-sm">You've been logged out.</p>
          </div>
        )}
        {passwordReset && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-6">
            <p className="text-emerald-400 text-sm">Password updated. Please sign in.</p>
          </div>
        )}

        {errors.general && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">
            <p className="text-red-400 text-sm">{errors.general}</p>
            {showResend && (
              <button
                onClick={handleResend}
                className="text-blue-400 hover:text-blue-300 text-sm mt-2 underline underline-offset-2"
              >
                {resendStatus || 'Resend verification email'}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
              className={`scout-input ${errors.email ? 'error' : ''}`}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
              className={`scout-input ${errors.password ? 'error' : ''}`}
            />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-white/40 hover:text-white/70 text-xs transition-colors"
            >
              Forgot your password?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="scout-btn-primary">
            {loading ? <span className="spinner spinner-dark mx-auto" /> : 'Sign in'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm">
          <span className="text-white/40">Don't have an account? </span>
          <Link to="/register" className="text-white/70 hover:text-white transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
