import { Link } from 'react-router-dom';
import { LogOut, PanelLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const auth = useAuth();

  return (
    <nav className="relative z-20 px-6 py-6 w-full max-w-6xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="liquid-glass rounded-xl p-2 text-white/70 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 text-xs font-medium"
            title="Toggle Research History Sidebar"
          >
            <PanelLeft size={18} />
            <span className="hidden sm:inline">History</span>
          </button>
        )}
        <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2">
          <span className="text-white font-semibold text-xl tracking-tight">Scout</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {auth.user ? (
          <>
            <span className="text-white/70 text-sm font-medium">
              {auth.user.username || (auth.user as any).user?.username || auth.user.email}
            </span>
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
