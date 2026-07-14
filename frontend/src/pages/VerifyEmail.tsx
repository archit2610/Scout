import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { api } from '../lib/api';

export default function VerifyEmail() {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || '';

  const [cooldown, setCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState('');

  const startCooldown = useCallback(() => {
    setCooldown(60);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) {
      setResendStatus('No email address available.');
      return;
    }
    try {
      setResendStatus('Sending...');
      await api.post('/api/v1/resend-emailverification', { email });
      setResendStatus('Verification email sent!');
      startCooldown();
    } catch (err: any) {
      setResendStatus(err.message || 'Failed to send. Try again.');
    }
  };

  return (
    <div className="min-h-screen bg-scout-dark flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[150px]" />

      <div className="auth-card animate-fade-in relative z-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <Mail size={28} className="text-white/60" />
        </div>

        <h1
          className="text-3xl text-white mb-3 tracking-tight"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Check your inbox
        </h1>

        <p className="text-white/50 text-sm mb-8 leading-relaxed">
          We've sent a verification link to{' '}
          {email ? <span className="text-white/80 font-medium">{email}</span> : 'your email'}
          . Click it to activate your account.
        </p>

        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="scout-btn-glass mb-4"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
        </button>

        {resendStatus && (
          <p className="text-white/50 text-xs mb-4 animate-fade-in">{resendStatus}</p>
        )}

        <Link
          to="/login"
          className="text-white/40 hover:text-white/70 text-sm transition-colors inline-block"
        >
          ← Back to login
        </Link>
      </div>
    </div>
  );
}
