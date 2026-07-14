import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const res = await api.post(`/api/v1/forgot-password/${token}`, {
        newPassword: password,
      });

      if (res.success) {
        navigate('/login?reset=true', { replace: true });
      } else {
        setErrors({ general: res.message || 'Reset password link is invalid or expired.' });
      }
    } catch (err: any) {
      setErrors({ general: err.message || 'Invalid or expired token. Please request a new link.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-scout-dark flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[150px]" />

      <div className="auth-card animate-fade-in relative z-10">
        <h1
          className="text-3xl text-white mb-2 tracking-tight text-center"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Set new password
        </h1>
        <p className="text-white/40 text-sm text-center mb-8">
          Enter your new password below
        </p>

        {errors.general ? (
          <div className="space-y-4 text-center">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-left">
              <p className="text-red-400 text-sm">{errors.general}</p>
            </div>
            <Link
              to="/forgot-password"
              className="scout-btn-primary block"
            >
              Request new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                className={`scout-input ${errors.password ? 'error' : ''}`}
              />
              {errors.password && <p className="field-error">{errors.password}</p>}
            </div>

            <div>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }}
                className={`scout-input ${errors.confirmPassword ? 'error' : ''}`}
              />
              {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" disabled={loading} className="scout-btn-primary mt-2">
              {loading ? <span className="spinner spinner-dark mx-auto" /> : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
