import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.username.trim()) errs.username = 'Username is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const body: Record<string, string> = {
        username: form.username,
        email: form.email,
        password: form.password,
      };
      if (form.fullName.trim()) body.fullName = form.fullName.trim();

      const res = await api.post('/api/v1/register', body);
      if (res.success) {
        navigate('/verify-email', { state: { email: form.email } });
      } else {
        setErrors({ general: res.message || 'Registration failed' });
      }
    } catch (err: any) {
      setErrors({ general: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="min-h-screen bg-scout-dark flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />

      <div className="auth-card animate-fade-in relative z-10">
        <h1
          className="text-3xl text-white mb-2 tracking-tight text-center"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Create your account
        </h1>
        <p className="text-white/40 text-sm text-center mb-8">
          Start your research journey with Scout
        </p>

        {errors.general && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">
            <p className="text-red-400 text-sm">{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Full name (optional)"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              className="scout-input"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={(e) => update('username', e.target.value)}
              className={`scout-input ${errors.username ? 'error' : ''}`}
            />
            {errors.username && <p className="field-error">{errors.username}</p>}
          </div>

          <div>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className={`scout-input ${errors.email ? 'error' : ''}`}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className={`scout-input ${errors.password ? 'error' : ''}`}
            />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          <div>
            <input
              type="password"
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              className={`scout-input ${errors.confirmPassword ? 'error' : ''}`}
            />
            {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
          </div>

          <button type="submit" disabled={loading} className="scout-btn-primary mt-2">
            {loading ? <span className="spinner spinner-dark mx-auto" /> : 'Create account'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm">
          <span className="text-white/40">Already have an account? </span>
          <Link to="/login" className="text-white/70 hover:text-white transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
