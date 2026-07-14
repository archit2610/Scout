import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Copy, Check, RefreshCw, Loader2, ChevronDown, ChevronUp, AlertCircle, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { api } from '../lib/api';
import { API_URL, ROUTES } from '../lib/constants';
import type { Report, AgentStep } from '../types';

export default function ReportPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<'loading' | 'ready' | 'running' | 'done' | 'error'>('loading');
  const [report, setReport] = useState<Report | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // SSE streaming states
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [subQuestions, setSubQuestions] = useState<string[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Refs for scrolling and SSE
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch initial report status
  const loadReport = async () => {
    if (!token) return;
    setPageState('loading');
    setErrorMessage('');

    if (token === 'anonymous') {
      const searchParams = new URLSearchParams(window.location.search);
      const question = searchParams.get('question');
      if (!question) {
        setErrorMessage('No question specified for anonymous research.');
        setPageState('error');
        return;
      }
      setReport({
        id: 'anonymous',
        token: 'anonymous',
        question,
        status: 'running',
        createdAt: new Date().toISOString()
      });
      setPageState('running');
      setSteps([{ label: 'Initiating connection...', status: 'in-progress' }]);
      setSubQuestions([]);
      setStreamingContent('');
      userScrolledUpRef.current = false;
      startAnonymousRun(question);
      return;
    }

    try {
      const res = await api.get<Report>(`/api/v1/auth/report/${token}`);
      if (res.success && res.data) {
        setReport(res.data);
        const status = res.data.status;

        if (status === 'done') {
          setStreamingContent(res.data.reportMd || '');
          setPageState('done');
        } else if (status === 'error') {
          setErrorMessage(res.message || 'Report execution failed.');
          setPageState('error');
        } else if (status === 'running') {
          setPageState('running');
          startSSE();
        } else {
          handleRun();
        }
      } else {
        setErrorMessage(res.message || 'Failed to fetch report details.');
        setPageState('error');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while loading the report.');
      setPageState('error');
    }
  };

  useEffect(() => {
    loadReport();
    return () => {
      closeSSE();
    };
  }, [token]);

  // Clean up and close EventSource
  const closeSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  // Start Agent Run
  const handleRun = async () => {
    if (!token) return;

    if (token === 'anonymous') {
      const searchParams = new URLSearchParams(window.location.search);
      const question = searchParams.get('question') || '';
      startAnonymousRun(question);
      return;
    }

    setPageState('running');
    setSteps([{ label: 'Initiating connection...', status: 'in-progress' }]);
    setSubQuestions([]);
    setStreamingContent('');
    userScrolledUpRef.current = false;

    try {
      const res = await api.get(`/api/v1/auth/report/${token}/run`);
      if (res.success) {
        startSSE();
      } else {
        setErrorMessage(res.message || 'Failed to initiate agent execution.');
        setPageState('error');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred starting execution.');
      setPageState('error');
    }
  };

  // Run anonymous research via POST request stream
  const startAnonymousRun = async (question: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        let errorMsg = `Server Error (HTTP ${response.status})`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorJson = await response.json();
            errorMsg = errorJson.message || errorJson.error || errorMsg;
          } else {
            const errorText = await response.text();
            errorMsg = errorText.slice(0, 300) || errorMsg;
          }
        } catch (e) {
          errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        }
        setErrorMessage(errorMsg);
        setPageState('error');
        return;
      }

      if (!response.body) {
        setErrorMessage('Response body is empty. Failed to receive streaming data.');
        setPageState('error');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
                  if (prev.length === 0) {
                    return [{ label: payload.label, status: 'in-progress' }];
                  }
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
                setSteps((prev) =>
                  prev.map(step => ({ ...step, status: 'completed' as const }))
                );
                setPageState('done');
                return;
              } else if (payload.type === 'error') {
                setErrorMessage(payload.message || 'Research failed.');
                setPageState('error');
                return;
              }
            } catch (err) {
              console.error('Error parsing anonymous stream data:', err);
            }
          }
        }
      }

      // If stream closes without explicit done event
      setSteps((prev) =>
        prev.map(step => ({ ...step, status: 'completed' as const }))
      );
      setPageState('done');

    } catch (err: any) {
      setErrorMessage(err.message || 'Connection lost.');
      setPageState('error');
    }
  };

  // Connect to SSE stream (for authenticated users)
  const startSSE = () => {
    if (!token) return;
    closeSSE();

    // Reset user scroll state
    userScrolledUpRef.current = false;

    const url = `${API_URL}/api/v1/auth/research/${token}/run`;
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    // Use onmessage since backend writes default 'message' event format
    es.onmessage = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);

        if (payload.type === 'stage') {
          setSteps((prev) => {
            if (prev.length === 0) {
              return [{ label: payload.label, status: 'in-progress' }];
            }
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
          closeSSE();
          setSteps((prev) =>
            prev.map(step => ({ ...step, status: 'completed' as const }))
          );

          // Fetch final complete report
          api.get<Report>(`/api/v1/auth/report/${token}`).then((res) => {
            if (res.success && res.data) {
              setReport(res.data);
              setStreamingContent(res.data.reportMd || '');
            }
          });
          setPageState('done');
        } else if (payload.type === 'error') {
          closeSSE();
          setErrorMessage(payload.message || 'An error occurred during research execution.');
          setPageState('error');
        }
      } catch (err) {
        console.error('Error parsing SSE event payload:', err);
      }
    };

    es.onerror = () => {
      closeSSE();
      setErrorMessage('SSE connection failed.');
      setPageState('error');
    };
  };

  // Scroll handler to check if user has scrolled up
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // If the user scrolls up by more than 50px from the bottom, disable auto-scroll
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 50;
    userScrolledUpRef.current = !isAtBottom;
  };

  // Auto-scroll logic as streamingContent updates
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || userScrolledUpRef.current) return;

    container.scrollTop = container.scrollHeight;
  }, [streamingContent]);

  // Copy report markdown to clipboard
  const handleCopy = () => {
    const textToCopy = streamingContent || report?.reportMd || '';
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-scout-dark flex flex-col">
      <Navbar />

      {/* Header and question */}
      <div className="max-w-6xl mx-auto w-full px-6 pt-8 pb-4">
        {pageState !== 'loading' && (
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors mb-4"
          >
            <ArrowLeft size={14} />
            Back to dashboard
          </button>
        )}
        <h1
          className="text-2xl md:text-3xl lg:text-4xl text-white/95 font-serif leading-tight"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {report?.question || 'Loading research question...'}
        </h1>
      </div>

      {/* Main content body */}
      <div className="flex-1 flex flex-col">
        {pageState === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center py-24">
            <Loader2 className="animate-spin text-white/40 mb-4" size={32} />
            <p className="text-white/40 text-sm">Loading research query details...</p>
          </div>
        )}

        {pageState === 'ready' && (
          <div className="flex-1 flex items-center justify-center px-6 py-12">
            <div className="liquid-glass rounded-2xl p-8 max-w-md w-full text-center border border-white/5 space-y-6">
              <div className="mx-auto w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                <Play size={20} className="text-white/70 translate-x-[1px]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Ready to research</h3>
                <p className="text-white/40 text-xs leading-relaxed">
                  Start the autonomous runner. Scout will plan research points, search sources, read articles, and compile a report.
                </p>
              </div>
              <button
                onClick={handleRun}
                className="scout-btn-primary w-full flex items-center justify-center gap-2"
              >
                <Play size={16} fill="black" />
                Run research
              </button>
            </div>
          </div>
        )}

        {pageState === 'running' && (
          <div className="max-w-6xl mx-auto w-full px-6 pb-12 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
            {/* Left Panel: Agent Log */}
            <div className="glass-card rounded-2xl p-5 border border-white/5 max-h-[500px] overflow-y-auto lg:sticky lg:top-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-semibold text-white/90">Research Log</h3>
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

              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs animate-fade-in">
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

            {/* Right Panel: Streaming Report */}
            <div className="flex flex-col h-[600px] lg:h-[700px]">
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 glass-card rounded-2xl p-6 lg:p-8 border border-white/5 overflow-y-auto"
              >
                {streamingContent ? (
                  <MarkdownRenderer content={streamingContent} />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-white/30 text-sm animate-pulse">Waiting for research synthesis to begin...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {pageState === 'done' && (
          <div className="max-w-4xl mx-auto w-full px-6 pb-20 space-y-6">
            {/* Mini Progress Summarizer */}
            {steps.length > 0 && (
              <div className="liquid-glass rounded-2xl p-4 border border-white/5">
                <button
                  onClick={() => setIsLogExpanded(!isLogExpanded)}
                  className="w-full flex items-center justify-between text-xs text-white/50 hover:text-white/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400" />
                    <span>Research complete · {steps.length} steps logged</span>
                  </div>
                  {isLogExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isLogExpanded && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-2 pl-6">
                    {steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-white/60">
                        <Check size={12} className="text-emerald-400 flex-shrink-0" />
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Full Report Markdown Box */}
            <div className="glass-card rounded-3xl p-8 lg:p-12 border border-white/5 relative">
              <div className="absolute top-6 right-6">
                <button
                  onClick={handleCopy}
                  className="scout-btn-glass rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-white/5 transition-all text-xs"
                >
                  {copied ? (
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

              <div className="pt-8">
                <MarkdownRenderer content={streamingContent || report?.reportMd || ''} />
              </div>
            </div>
          </div>
        )}

        {pageState === 'error' && (
          <div className="flex-1 flex items-center justify-center px-6 py-12">
            <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center border border-red-500/10 space-y-6">
              <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Research Error</h3>
                <p className="text-white/40 text-xs leading-relaxed">
                  {errorMessage || 'An error occurred during report synthesis.'}
                </p>
              </div>
              <button
                onClick={handleRun}
                className="scout-btn-primary w-full flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                Retry research
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
