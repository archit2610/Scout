import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';

export default function Navbar() {
  const auth = useAuth();

  return (
    <nav className="relative z-20 px-6 py-6 w-full max-w-5xl mx-auto flex items-center justify-between">
      <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2">
        <span className="text-white font-semibold text-xl tracking-tight">Scout</span>
      </Link>

      <div className="flex items-center gap-4">
        {auth.user ? (
          <>
            <span className="text-white/70 text-sm font-medium">{auth.user.username}</span>
            <button
              onClick={() => auth.logout()}
              className="liquid-glass rounded-full px-5 py-2 text-white text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
            >
              <LogOut size={16} />
              Logout
            </button>
          </>
        ) : (
          <Link
            to={ROUTES.LOGIN}
            className="liquid-glass rounded-full px-5 py-2 text-white text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
