import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Send,
  Sparkles,
  Loader2,
  Check,
  Copy,
  AlertCircle,
  Zap,
  Menu,
  Plus,
  ArrowUpRight
} from 'lucide-react';
import ConversationSidebar from '../components/ConversationSidebar';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { api } from '../lib/api';
import { API_URL } from '../lib/constants';
import type { Report, AgentStep } from '../types';

export default function ChatApp() {
  const { conversationId: paramConvoId, token: paramToken } = useParams<{ conversationId?: string; token?: string }>();
  const navigate = useNavigate();

  const [activeConvoId, setActiveConvoId] = useState<string | undefined>(paramConvoId);
  const [reportsThread, setReportsThread] = useState<Report[]>([]);
  const [pageState, setPageState] = useState<'idle' | 'loading' | 'running' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Mobile sidebar toggle state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Input prompt state
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active streaming state
  const [activeRunQuestion, setActiveRunQuestion] = useState('');
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [subQuestions, setSubQuestions] = useState<string[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Video fade refs & opacity state
  const videoRef = useRef<HTMLVideoElement>(null);
  const fadingOutRef = useRef(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const [videoOpacity, setVideoOpacity] = useState(0);

  // Scroll & SSE refs
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // --- Background Video Loop Animations ---
  const animateOpacity = (target: number, duration: number, onComplete?: () => void) => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    const startOpacity = videoOpacity;
    const startTime = performance.now();

    const step = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentOpacity = startOpacity + (target - startOpacity) * progress;

      setVideoOpacity(currentOpacity);

      if (progress < 1) {
        animationFrameIdRef.current = requestAnimationFrame(step);
      } else if (onComplete) {
        onComplete();
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(step);
  };

  const fadeIn = (duration = 500) => animateOpacity(1, duration);
  const fadeOut = (duration = 500) => {
    fadingOutRef.current = true;
    animateOpacity(0, duration);
  };

  const handlePlay = () => fadeIn(500);
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.duration && video.duration - video.currentTime <= 0.55 && !fadingOutRef.current) {
      fadeOut(500);
    }
  };

  const handleEnded = () => {
    const video = videoRef.current;
    if (!video) return;
    setVideoOpacity(0);
    setTimeout(() => {
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
        fadingOutRef.current = false;
        fadeIn(500);
      }
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, []);

  const closeSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  // Load thread history by conversation ID
  const loadThreadHistory = async (convoId: string) => {
    try {
      let res;
      try {
        res = await api.get<{ reports: Report[] }>(`/api/v1/conversations/${convoId}/reports`);
      } catch {
        res = await api.get<{ reports: Report[] }>(`/api/v1/conversation/${convoId}/reports`);
      }
      if (res.success && res.data && Array.isArray(res.data.reports) && res.data.reports.length > 0) {
        setReportsThread(res.data.reports);
      }
      setPageState('done');
    } catch (err: any) {
      console.error('Failed to load thread history:', err);
      setPageState('done');
    }
  };

  // Synchronize URL & params
  useEffect(() => {
    closeSSE();

    if (paramConvoId) {
      setActiveConvoId(paramConvoId);
      loadThreadHistory(paramConvoId);
    } else if (paramToken && paramToken !== 'anonymous') {
      api.get<Report>(`/api/v1/auth/report/${paramToken}`).then((res) => {
        if (res.success && res.data) {
          const r = res.data;
          if (r.conversationId) {
            setActiveConvoId(r.conversationId);
            window.history.replaceState({}, '', `/c/${r.conversationId}`);
            loadThreadHistory(r.conversationId);
          } else {
            setReportsThread([r]);
            setPageState('done');
          }
        }
      });
    } else {
      setActiveConvoId(undefined);
      setReportsThread([]);
      setPageState('idle');
    }

    return () => closeSSE();
  }, [paramConvoId, paramToken]);

  // Scroll to bottom on streaming content update
  useEffect(() => {
    if (feedContainerRef.current) {
      feedContainerRef.current.scrollTop = feedContainerRef.current.scrollHeight;
    }
  }, [streamingContent, steps, reportsThread, pageState]);

  // Anonymous streaming runner
  const startAnonymousStream = async (q: string, targetConvoId?: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: q, conversationId: targetConvoId }),
      });

      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      if (!response.body) throw new Error('Response body empty.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let activeConvoFromStream = targetConvoId;

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
                const cId = payload.conversationId || activeConvoFromStream || targetConvoId;

                setStreamingContent((currentContent) => {
                  if (currentContent) {
                    setReportsThread((prev) => [
                      ...prev,
                      {
                        id: `anon_${Date.now()}`,
                        question: q,
                        status: 'done',
                        reportMd: currentContent,
                        conversationId: cId,
                        createdAt: new Date().toISOString(),
                      }
                    ]);
                  }
                  return '';
                });

                if (cId) {
                  activeConvoFromStream = cId;
                  setActiveConvoId(cId);
                  window.history.pushState({}, '', `/c/${cId}`);
                  loadThreadHistory(cId);
                }
                setPageState('done');
                return;
              } else if (payload.type === 'error') {
                setErrorMessage(payload.message || 'Research failed.');
                setPageState('error');
                return;
              }
            } catch (err) {
              console.error('Error parsing stream:', err);
            }
          }
        }
      }

      setPageState('done');
      if (activeConvoFromStream) loadThreadHistory(activeConvoFromStream);
    } catch (err: any) {
      setErrorMessage(err.message || 'Stream error.');
      setPageState('error');
    }
  };

  // Authenticated SSE runner
  const startSSE = (reportToken: string, targetConvoId?: string) => {
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
          const cId = payload.conversationId || targetConvoId || activeConvoId;

          setStreamingContent((currentContent) => {
            if (currentContent) {
              setReportsThread((prev) => {
                if (payload.reportId && prev.some(r => r.id === payload.reportId)) return prev;
                return [
                  ...prev,
                  {
                    id: payload.reportId || `sse_${Date.now()}`,
                    question: activeRunQuestion,
                    status: 'done',
                    reportMd: currentContent,
                    conversationId: cId,
                    createdAt: new Date().toISOString(),
                  }
                ];
              });
            }
            return '';
          });

          if (cId) {
            setActiveConvoId(cId);
            window.history.pushState({}, '', `/c/${cId}`);
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
      setErrorMessage('Connection failed.');
      setPageState('error');
    };
  };

  // Handle Form Submission (Continuous Chatbot Flow)
  const handleSubmitPrompt = async (e?: FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const q = (customPrompt || inputPrompt).trim();
    if (q.length < 5 || isSubmitting) return;

    setInputPrompt('');
    setIsSubmitting(true);
    setActiveRunQuestion(q);
    setStreamingContent('');
    setSteps([{ label: 'Planning research & memory lookup...', status: 'in-progress' }]);
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
        if (convoId) {
          setActiveConvoId(convoId);
          window.history.pushState({}, '', `/c/${convoId}`);
        }

        if (newReportId) {
          startSSE(newReportId, convoId);
        } else {
          startAnonymousStream(q, convoId);
        }
      } else {
        startAnonymousStream(q, activeConvoId);
      }
    } catch {
      startAnonymousStream(q, activeConvoId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewChat = () => {
    closeSSE();
    setActiveConvoId(undefined);
    setReportsThread([]);
    setPageState('idle');
    setInputPrompt('');
    window.history.pushState({}, '', '/');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const hasThread = reportsThread.length > 0 || pageState === 'running';

  return (
    <div className="flex h-screen w-screen bg-black text-white overflow-hidden font-sans relative">
      {/* Background Video Container - Scout Signature Video Atmosphere */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4"
          className="absolute inset-0 w-full h-full object-cover translate-y-[17%] transition-none"
          style={{ opacity: videoOpacity }}
          muted
          autoPlay
          playsInline
          onPlay={handlePlay}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
        {/* Soft overlay vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80" />
      </div>

      {/* Desktop Permanent Left Sidebar */}
      <ConversationSidebar
        activeConversationId={activeConvoId}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSelectConversation={(id) => navigate(`/c/${id}`)}
        onNewChat={handleNewChat}
      />

      {/* Main Chat App Area */}
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 px-6 flex items-center justify-between shrink-0 border-b border-white/5 bg-black/40 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span
                className="text-2xl font-serif text-white tracking-tight"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Scout
              </span>
            </div>
          </div>

          <button
            onClick={handleNewChat}
            className="md:hidden text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="New Chat"
          >
            <Plus size={18} />
          </button>
        </header>

        {/* Scrollable Chat Feed */}
        <div ref={feedContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 space-y-8">
          {/* Initial / Empty State Hero View */}
          {!hasThread && pageState !== 'loading' && (
            <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto text-center py-12 px-4">
              <h1
                className="text-4xl md:text-5xl lg:text-6xl text-white mb-6 tracking-tight whitespace-normal"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                What do you want to research?
              </h1>
              <p className="text-white/40 text-xs md:text-sm mb-8 leading-relaxed max-w-lg">
                Scout combines multi-step web research with persistent conversation memory to deliver cited reports.
              </p>

              {/* Sample Quick Starters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {[
                  "Analyze Tesla's financial performance",
                  "Compare Next.js vs Remix performance",
                  "Explain vector search & pgvector embeddings",
                  "Latest trends in AI Agent Frameworks"
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmitPrompt(undefined, sample)}
                    className="liquid-glass p-3.5 text-left rounded-xl border border-white/10 hover:bg-white/10 text-xs text-white/80 transition-all flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">{sample}</span>
                    <ArrowUpRight size={14} className="shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {pageState === 'loading' && (
            <div className="h-full flex flex-col items-center justify-center text-white/40 text-xs">
              <Loader2 className="animate-spin mb-3" size={24} />
              <span>Loading conversation memory...</span>
            </div>
          )}

          {/* Render Completed Thread History */}
          {reportsThread.map((r, index) => (
            <div key={r.id || index} className="max-w-4xl mx-auto space-y-4 animate-fade-in">
              {/* User Question Message */}
              <div className="flex justify-end">
                <div className="liquid-glass text-white text-sm md:text-base px-5 py-3.5 rounded-2xl rounded-tr-sm max-w-2xl border border-white/15 leading-relaxed shadow-lg">
                  {r.question}
                </div>
              </div>

              {/* Scout Assistant Answer Block */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0 mt-1">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div className="flex-1 glass-card rounded-3xl p-6 md:p-8 border border-white/10 relative space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    {r.usedMemory ? (
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                        <Zap size={12} />
                        Answered via Memory
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-semibold text-white/40 tracking-wider">
                        Scout Report
                      </span>
                    )}

                    <button
                      onClick={() => handleCopy(r.id, r.reportMd || '')}
                      className="text-white/40 hover:text-white p-1 rounded-lg transition-colors text-xs flex items-center gap-1"
                    >
                      {copiedId === r.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div className="pt-2">
                    <MarkdownRenderer content={r.reportMd || ''} />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Active Live Running Turn */}
          {pageState === 'running' && (
            <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
              {/* Active User Question Message */}
              <div className="flex justify-end">
                <div className="liquid-glass text-white text-sm md:text-base px-5 py-3.5 rounded-2xl rounded-tr-sm max-w-2xl border border-white/15 leading-relaxed shadow-lg">
                  {activeRunQuestion}
                </div>
              </div>

              {/* Scout Live Response Block */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0 mt-1">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div className="flex-1 glass-card rounded-3xl p-6 md:p-8 border border-white/10 space-y-4">
                  {/* Agent Progress Log */}
                  <div className="space-y-2 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between text-xs font-medium text-white/70 border-b border-white/5 pb-2">
                      <span>Autonomous Research Log</span>
                      <Loader2 className="animate-spin text-blue-400" size={13} />
                    </div>

                    {subQuestions.length > 0 && (
                      <div className="space-y-1 my-2">
                        <p className="text-[10px] uppercase text-white/40 font-semibold tracking-wider">Research Plan</p>
                        <ol className="list-decimal pl-4 space-y-0.5">
                          {subQuestions.map((q, idx) => (
                            <li key={idx} className="text-[11px] text-white/60">{q}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-white/60">
                        {step.status === 'completed' ? (
                          <Check size={13} className="text-emerald-400 shrink-0" />
                        ) : (
                          <Loader2 size={13} className="text-blue-400 animate-spin shrink-0" />
                        )}
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Streaming Markdown Report */}
                  {streamingContent ? (
                    <MarkdownRenderer content={streamingContent} />
                  ) : (
                    <div className="py-6 text-center text-xs text-white/30 animate-pulse">
                      Synthesizing research findings...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {pageState === 'error' && (
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
              <AlertCircle size={20} className="text-red-400 mx-auto" />
              <p className="text-xs text-white/70">{errorMessage || 'An error occurred during research.'}</p>
            </div>
          )}
        </div>

        {/* Anchored Bottom Chat Bar */}
        <div className="p-4 bg-black/60 backdrop-blur-xl border-t border-white/5 shrink-0 z-20">
          <form onSubmit={(e) => handleSubmitPrompt(e)} className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="relative flex-1 liquid-glass rounded-xl border border-white/10 focus-within:border-white/30 transition-all">
              <input
                type="text"
                placeholder={hasThread ? "Ask a follow-up question in this thread..." : "Describe your research query in detail..."}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                disabled={pageState === 'running' || isSubmitting}
                className="w-full bg-transparent border-none outline-none text-white placeholder:text-white/40 text-xs md:text-sm px-4 py-3.5 focus:ring-0 disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={inputPrompt.trim().length < 5 || pageState === 'running' || isSubmitting}
              className="bg-white text-black rounded-xl p-3.5 hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            </button>
          </form>
        </div>

        {/* Footer Area */}
        <footer className="py-2 px-6 border-t border-white/5 bg-black/80 backdrop-blur-md shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 z-20">
          <span className="text-white/40 text-[11px]">© 2026 Scout Inc. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="https://x.com/ArchitSa" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors text-[11px]">
              Twitter
            </a>
            <span className="text-white/20 text-[10px]">•</span>
            <a href="https://github.com/archit2610/Scout" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors text-[11px]">
              GitHub
            </a>
            <span className="text-white/20 text-[10px]">•</span>
            <a href="https://www.linkedin.com/in/archit-sarawagi-6b73872bb/" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors text-[11px]">
              LinkedIn
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
