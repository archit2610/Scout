import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Deliberately ambiguous API call success message as per security requirements
      await api.post('/api/v1/forgot-password', { email });
      setSubmitted(true);
    } catch {
      // Even on error we might show the same message or generic error, but let's show the success message to be secure
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-scout-dark flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[150px]" />

      <div className="auth-card animate-fade-in relative z-10 text-center">
        <h1
          className="text-3xl text-white mb-3 tracking-tight"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Reset your password
        </h1>

        {submitted ? (
          <div className="space-y-6">
            <p className="text-white/60 text-sm leading-relaxed">
              If an account exists for that email, you'll receive a reset link shortly.
            </p>
            <Link
              to="/login"
              className="scout-btn-primary block"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <p className="text-white/50 text-sm mb-6 text-center leading-relaxed">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className={`scout-input ${error ? 'error' : ''}`}
              />
              {error && <p className="field-error">{error}</p>}
            </div>

            <button type="submit" disabled={loading} className="scout-btn-primary w-full">
              {loading ? <span className="spinner spinner-dark mx-auto" /> : 'Send reset link'}
            </button>

            <div className="text-center mt-6">
              <Link
                to="/login"
                className="text-white/40 hover:text-white/70 text-sm transition-colors"
              >
                ← Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
