import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Send,
  Zap,
  PanelLeft,
  Sparkles
} from 'lucide-react';
import Navbar from '../components/Navbar';
import MarkdownRenderer from '../components/MarkdownRenderer';
import ConversationSidebar from '../components/ConversationSidebar';
import { api } from '../lib/api';
import { API_URL, ROUTES } from '../lib/constants';
import type { Report, AgentStep } from '../types';

export default function ReportPage() {
  const { token, conversationId: paramConvoId } = useParams<{ token?: string; conversationId?: string }>();
  const navigate = useNavigate();

  const [activeConvoId, setActiveConvoId] = useState<string | undefined>(paramConvoId);
  const [reportsThread, setReportsThread] = useState<Report[]>([]);
  const [pageState, setPageState] = useState<'loading' | 'running' | 'done' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // New follow-up question input state
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);

  // Live streaming states for current active run
  const [currentRunQuestion, setCurrentRunQuestion] = useState('');
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [subQuestions, setSubQuestions] = useState<string[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // SSE ref
  const eventSourceRef = useRef<EventSource | null>(null);

  // Close SSE helper
  const closeSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  // Fetch thread history by conversation ID
  const loadThreadHistory = async (convoId: string) => {
    setPageState('loading');
    setErrorMessage('');
    try {
      const res = await api.get<{ reports: Report[] }>(`/api/v1/conversations/${convoId}/reports`);
      if (res.success && res.data) {
        const list = res.data.reports || [];
        setReportsThread(list);
        setPageState('done');
      } else {
        setErrorMessage(res.message || 'Failed to load thread history.');
        setPageState('error');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load conversation thread.');
      setPageState('error');
    }
  };

  // Initial loader
  useEffect(() => {
    closeSSE();

    if (paramConvoId) {
      setActiveConvoId(paramConvoId);
      loadThreadHistory(paramConvoId);
    } else if (token && token !== 'anonymous') {
      // Fetch single report to extract conversationId
      api.get<Report>(`/api/v1/auth/report/${token}`).then((res) => {
        if (res.success && res.data) {
          const r = res.data;
          if (r.conversationId) {
            setActiveConvoId(r.conversationId);
            navigate(`/c/${r.conversationId}`, { replace: true });
          } else {
            setReportsThread([r]);
            if (r.status === 'done') {
              setPageState('done');
            } else if (r.status === 'running') {
              setPageState('running');
              setCurrentRunQuestion(r.question);
              startSSE(token);
            }
          }
        }
      }).catch((err) => {
        setErrorMessage(err.message || 'Error fetching report.');
        setPageState('error');
      });
    } else if (token === 'anonymous') {
      const searchParams = new URLSearchParams(window.location.search);
      const q = searchParams.get('question') || '';
      if (!q) {
        setErrorMessage('No question provided for research.');
        setPageState('error');
        return;
      }
      setCurrentRunQuestion(q);
      setPageState('running');
      setSteps([{ label: 'Initiating connection...', status: 'in-progress' }]);
      setStreamingContent('');
      startAnonymousStream(q);
    }

    return () => closeSSE();
  }, [token, paramConvoId]);

  // Anonymous streaming runner
  const startAnonymousStream = async (q: string, convoId?: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: q, conversationId: convoId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is empty.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let activeConvoFromStream = convoId;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));

              if (payload.type === 'stage') {
                setSteps((prev) => {
                  if (prev.length === 0) return [{ label: payload.label, status: 'in-progress' }];
                  const updated = prev.map((step, idx) =>
                    idx === prev.length - 1 ? { ...step, status: 'completed' as const } : step
                  );
                  return [...updated, { label: payload.label, status: 'in-progress' }];
                });
              } else if (payload.type === 'plan') {
                if (payload.subQuestions && Array.isArray(payload.subQuestions)) {
                  setSubQuestions(payload.subQuestions);
                }
              } else if (payload.type === 'token') {
                setStreamingContent((prev) => prev + (payload.data || ''));
              } else if (payload.type === 'done') {
                setSteps((prev) => prev.map(step => ({ ...step, status: 'completed' as const })));
                if (payload.conversationId) {
                  activeConvoFromStream = payload.conversationId;
                  setActiveConvoId(payload.conversationId);
                }
                setPageState('done');
                if (activeConvoFromStream) {
                  loadThreadHistory(activeConvoFromStream);
                }
                return;
              } else if (payload.type === 'error') {
                setErrorMessage(payload.message || 'Research failed.');
                setPageState('error');
                return;
              }
            } catch (err) {
              console.error('Error parsing stream data:', err);
            }
          }
        }
      }

      setPageState('done');
      if (activeConvoFromStream) {
        loadThreadHistory(activeConvoFromStream);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Stream connection error.');
      setPageState('error');
    }
  };

  // Authenticated SSE runner
  const startSSE = (reportToken: string) => {
    closeSSE();
    const url = `${API_URL}/api/v1/auth/report/${reportToken}/run`;
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);

        if (payload.type === 'stage') {
          setSteps((prev) => {
            if (prev.length === 0) return [{ label: payload.label, status: 'in-progress' }];
            const updated = prev.map((step, idx) =>
              idx === prev.length - 1 ? { ...step, status: 'completed' as const } : step
            );
            return [...updated, { label: payload.label, status: 'in-progress' }];
          });
        } else if (payload.type === 'plan') {
          if (payload.subQuestions) setSubQuestions(payload.subQuestions);
        } else if (payload.type === 'token') {
          setStreamingContent((prev) => prev + (payload.data || ''));
        } else if (payload.type === 'done') {
          closeSSE();
          setSteps((prev) => prev.map(step => ({ ...step, status: 'completed' as const })));
          const cId = payload.conversationId || activeConvoId;
          if (cId) {
            setActiveConvoId(cId);
            loadThreadHistory(cId);
          }
          setPageState('done');
        } else if (payload.type === 'error') {
          closeSSE();
          setErrorMessage(payload.message || 'Research failed.');
          setPageState('error');
        }
      } catch (err) {
        console.error('Error parsing SSE:', err);
      }
    };

    es.onerror = () => {
      closeSSE();
      setErrorMessage('SSE connection lost.');
      setPageState('error');
    };
  };

  // Submit follow-up question
  const handleFollowUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = followUpQuestion.trim();
    if (q.length < 5 || isSubmittingFollowUp) return;

    setFollowUpQuestion('');
    setIsSubmittingFollowUp(true);
    setCurrentRunQuestion(q);
    setStreamingContent('');
    setSteps([{ label: 'Retrieving conversation memory...', status: 'in-progress' }]);
    setSubQuestions([]);
    setPageState('running');

    try {
      const res = await api.post<{ report?: { id: string }; conversationId?: string }>('/api/v1/auth/create', {
        question: q,
        conversationId: activeConvoId,
      });

      if (res.success && res.data) {
        const newReportId = res.data.report?.id;
        const convoId = res.data.conversationId || activeConvoId;
        if (convoId) setActiveConvoId(convoId);

        if (newReportId) {
          startSSE(newReportId);
        } else {
          startAnonymousStream(q, convoId);
        }
      } else {
        startAnonymousStream(q, activeConvoId);
      }
    } catch {
      startAnonymousStream(q, activeConvoId);
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  // Copy markdown
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-scout-dark flex flex-col relative overflow-x-hidden">
      <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* Conversation History Sidebar */}
      <ConversationSidebar
        activeConversationId={activeConvoId}
        isOpenMobile={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Header bar with Sidebar toggle */}
      <div className="max-w-5xl mx-auto w-full px-6 pt-6 pb-2 flex items-center justify-between">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white liquid-glass px-3 py-1.5 rounded-xl border border-white/10 transition-all"
        >
          <PanelLeft size={16} />
          <span>Research Threads</span>
        </button>

        <button
          onClick={() => navigate(ROUTES.DASHBOARD)}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors"
        >
          <ArrowLeft size={14} />
          New Research
        </button>
      </div>

      {/* Main Content Feed */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-4 pb-32 space-y-8">
        {pageState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="animate-spin text-white/40 mb-4" size={32} />
            <p className="text-white/40 text-sm">Loading research thread...</p>
          </div>
        )}

        {/* Existing Thread Reports */}
        {reportsThread.map((r, index) => (
          <article key={r.id || index} className="space-y-4 animate-fade-in">
            {/* Question Banner */}
            <div className="liquid-glass rounded-2xl p-5 border border-white/10 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 mt-0.5">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-white/40">Question {index + 1}</span>
                  <h2 className="text-xl font-serif text-white leading-snug" style={{ fontFamily: "'Instrument Serif', serif" }}>
                    {r.question}
                  </h2>
                </div>
              </div>

              {/* Used Memory Badge */}
              {r.usedMemory && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex-shrink-0">
                  <Zap size={12} />
                  <span>Answered via Memory</span>
                </div>
              )}
            </div>

            {/* Answer Report Content */}
            <div className="glass-card rounded-3xl p-8 lg:p-10 border border-white/5 relative">
              <div className="absolute top-6 right-6">
                <button
                  onClick={() => handleCopy(r.id, r.reportMd || '')}
                  className="scout-btn-glass rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-white/5 transition-all text-xs"
                >
                  {copiedId === r.id ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-4">
                <MarkdownRenderer content={r.reportMd || ''} />
              </div>
            </div>
          </article>
        ))}

        {/* Live Running State for current active query */}
        {pageState === 'running' && (
          <div className="space-y-6 animate-fade-in">
            <div className="liquid-glass rounded-2xl p-5 border border-white/10 flex items-center gap-3">
              <Loader2 className="animate-spin text-blue-400 flex-shrink-0" size={20} />
              <div>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-blue-400">Researching...</span>
                <h3 className="text-lg font-serif text-white leading-snug" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  {currentRunQuestion}
                </h3>
              </div>
            </div>

            {/* Agent Progress Panel */}
            <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-semibold text-white/90">Autonomous Research Log</span>
                <Loader2 className="animate-spin text-blue-400" size={14} />
              </div>

              {subQuestions.length > 0 && (
                <div className="space-y-2 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium">Research Plan</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    {subQuestions.map((q, idx) => (
                      <li key={idx} className="text-xs text-white/60 leading-relaxed">{q}</li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="space-y-2.5">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs">
                    {step.status === 'completed' ? (
                      <Check size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Loader2 size={14} className="text-blue-400 animate-spin mt-0.5 flex-shrink-0" />
                    )}
                    <span className={step.status === 'completed' ? 'text-white/60' : 'text-white font-medium'}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Streaming Report Box */}
            <div className="glass-card rounded-3xl p-8 border border-white/5 min-h-[300px]">
              {streamingContent ? (
                <MarkdownRenderer content={streamingContent} />
              ) : (
                <div className="h-40 flex items-center justify-center text-white/30 text-xs animate-pulse">
                  Synthesizing report findings...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {pageState === 'error' && (
          <div className="glass-card rounded-2xl p-6 border border-red-500/10 text-center space-y-4">
            <AlertCircle size={24} className="text-red-400 mx-auto" />
            <p className="text-white/60 text-xs">{errorMessage || 'An error occurred during research.'}</p>
          </div>
        )}
      </main>

      {/* Floating Bottom Chat Bar for Follow-up Questions */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-black/80 backdrop-blur-xl border-t border-white/10">
        <form onSubmit={handleFollowUpSubmit} className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="relative flex-1 liquid-glass rounded-xl border border-white/10 focus-within:border-white/30 transition-all">
            <input
              type="text"
              placeholder="Ask a follow-up question in this thread..."
              value={followUpQuestion}
              onChange={(e) => setFollowUpQuestion(e.target.value)}
              disabled={pageState === 'running' || isSubmittingFollowUp}
              className="w-full bg-transparent border-none outline-none text-white placeholder:text-white/40 text-xs md:text-sm px-4 py-3 focus:ring-0 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={followUpQuestion.trim().length < 5 || pageState === 'running' || isSubmittingFollowUp}
            className="bg-white text-black rounded-xl p-3 hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isSubmittingFollowUp ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </form>
      </footer>
    </div>
  );
}
