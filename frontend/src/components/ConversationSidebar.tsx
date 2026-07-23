import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, Trash2, X, LogOut, User as UserIcon, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { ROUTES } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import type { Conversation } from '../types';

interface ConversationSidebarProps {
  activeConversationId?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onSelectConversation?: (id: string) => void;
  onNewChat?: () => void;
}

export default function ConversationSidebar({
  activeConversationId,
  isOpenMobile = false,
  onCloseMobile,
  onSelectConversation,
  onNewChat,
}: ConversationSidebarProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingConvo, setDeletingConvo] = useState<Conversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      let res;
      try {
        res = await api.get<{ conversations: Conversation[] }>('/api/v1/conversations');
      } catch {
        res = await api.get<{ conversations: Conversation[] }>('/api/v1/conversation');
      }
      if (res.success && res.data) {
        setConversations(res.data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [activeConversationId]);

  const openDeleteModal = (e: React.MouseEvent, convo: Conversation) => {
    e.stopPropagation();
    setDeletingConvo(convo);
  };

  const confirmDelete = async () => {
    if (!deletingConvo) return;
    setIsDeleting(true);
    const targetId = deletingConvo.id;

    try {
      try {
        await api.delete(`/api/v1/conversation/${targetId}/delete`);
      } catch {
        try {
          await api.delete(`/api/v1/conversations/${targetId}/delete`);
        } catch {
          await api.delete(`/api/v1/conversations/${targetId}`);
        }
      }

      setConversations((prev) => prev.filter((c) => c.id !== targetId));
      if (activeConversationId === targetId) {
        if (onNewChat) onNewChat();
        else navigate(ROUTES.DASHBOARD);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    } finally {
      setIsDeleting(false);
      setDeletingConvo(null);
    }
  };

  const handleSelect = (id: string) => {
    if (onSelectConversation) {
      onSelectConversation(id);
    } else {
      navigate(`/c/${id}`);
    }
    if (onCloseMobile) onCloseMobile();
  };

  const handleNewResearch = () => {
    if (onNewChat) {
      onNewChat();
    } else {
      navigate(ROUTES.DASHBOARD);
    }
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden"
        />
      )}

      {/* Custom Liquid Glass Delete Confirmation Modal */}
      {deletingConvo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="liquid-glass rounded-2xl p-6 max-w-sm w-full border border-white/15 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <h3 className="text-base font-semibold text-white">Delete Research Thread?</h3>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              This will permanently remove "<span className="text-white font-medium">{deletingConvo.title}</span>" and its saved memory.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingConvo(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="animate-spin" size={14} /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Drawer Container - Liquid Glass Styling */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 lg:w-72 bg-black/60 border-r border-white/10 backdrop-blur-xl flex flex-col h-full shrink-0 transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div
            onClick={handleNewResearch}
            className="cursor-pointer group"
          >
            <span
              className="text-2xl font-serif text-white tracking-tight px-1"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Scout
            </span>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden text-white/50 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* New Chat Button - Liquid Glass Button */}
        <div className="p-3">
          <button
            onClick={handleNewResearch}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white text-black font-medium text-xs hover:bg-white/90 transition-all shadow-lg shadow-white/5 group"
          >
            <Plus size={16} className="group-hover:scale-110 transition-transform" />
            <span>New Research</span>
          </button>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          <div className="px-3 py-1.5 text-[10px] uppercase font-semibold tracking-wider text-white/40">
            Research History
          </div>

          {isLoading && conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-white/30 animate-pulse">
              Loading research memory...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-white/30">
              No research threads yet.
            </div>
          ) : (
            conversations.map((convo) => {
              const isActive = convo.id === activeConversationId;
              return (
                <div
                  key={convo.id}
                  onClick={() => handleSelect(convo.id)}
                  className={`group relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'liquid-glass text-white font-medium border border-white/20 bg-white/10'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <MessageSquare size={15} className="shrink-0 opacity-70" />
                  <span className="text-xs truncate flex-1 leading-tight">{convo.title}</span>
                  <button
                    onClick={(e) => openDeleteModal(e, convo)}
                    className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 p-1 transition-all"
                    title="Delete thread"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* User Footer Account Area */}
        <div className="p-3 border-t border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md">
          {auth.user ? (
            <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white shrink-0 border border-white/10">
                {(auth.user.username || (auth.user as any).user?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-white/80 truncate">
                {auth.user.username || (auth.user as any).user?.username || auth.user.email}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <UserIcon size={14} />
              <span>Guest Visitor</span>
            </div>
          )}

          {auth.user ? (
            <button
              onClick={() => auth.logout()}
              className="text-white/40 hover:text-white p-1.5 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          ) : (
            <button
              onClick={() => navigate(ROUTES.LOGIN)}
              className="text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors"
            >
              Login
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
