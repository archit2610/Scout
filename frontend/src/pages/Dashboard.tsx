import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import ConversationSidebar from '../components/ConversationSidebar';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Video fade refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const fadingOutRef = useRef(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const [videoOpacity, setVideoOpacity] = useState(0);

  // Load and Loop Fade animations
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
      } else {
        if (onComplete) onComplete();
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(step);
  };

  const fadeIn = (duration = 500) => {
    animateOpacity(1, duration);
  };

  const fadeOut = (duration = 500) => {
    fadingOutRef.current = true;
    animateOpacity(0, duration);
  };

  // Video event handlers
  const handlePlay = () => {
    fadeIn(500);
  };

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
        video.play().catch(() => { });
        fadingOutRef.current = false;
        fadeIn(500);
      }
    }, 100);
  };

  // Clean up animation frames
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (question.trim().length < 10 || isSubmitting) return;

    // Check if user is logged in
    if (!auth.user) {
      navigate(`/report/anonymous?question=${encodeURIComponent(question.trim())}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<{ report?: { id: string; token?: string }; conversationId?: string; reportId?: string; token?: string }>('/api/v1/auth/create', {
        question: question.trim(),
      });

      if (res.success && res.data) {
        const convoId = res.data.conversationId;
        const reportToken = res.data.report?.id || res.data.report?.token || res.data.token || res.data.reportId;
        if (convoId) {
          navigate(`/c/${convoId}`);
        } else if (reportToken) {
          navigate(`/report/${reportToken}`);
        } else {
          alert('Failed to retrieve report token.');
        }
      } else {
        alert(res.message || 'Failed to start research.');
      }
    } catch {
      alert('Error initiating research. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scroll listener for footer reveal
  const [showFooter, setShowFooter] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollPos = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;

      // When scrolled near the bottom, slide the footer up
      if (docHeight - (scrollPos + windowHeight) <= 60) {
        setShowFooter(true);
      } else {
        setShowFooter(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount to check initial scroll position
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="min-h-[140vh] bg-black overflow-x-hidden flex flex-col relative pb-20">
      {/* Background Video Container - FIXED to cover the entire page on scroll */}
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

      {/* Conversation Sidebar */}
      <ConversationSidebar
        isOpenMobile={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* Hero Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center -translate-y-[5%] max-w-4xl mx-auto w-full">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl text-white mb-8 tracking-tight whitespace-normal md:whitespace-nowrap"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            What do you want to research?
          </h1>

          <form onSubmit={handleSubmit} className="liquid-glass rounded-2xl p-2 w-full max-w-2xl transition-all duration-300 focus-within:bg-white/[0.03]">
            <div className="flex items-start gap-3">
              <textarea
                placeholder="Describe your research query in detail..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                className="bg-transparent border-none outline-none text-white placeholder:text-white/40 text-base w-full resize-none p-4 font-sans focus:ring-0"
              />
              <button
                type="submit"
                disabled={question.trim().length < 10 || isSubmitting}
                className="bg-white rounded-xl p-3 text-black hover:bg-white/90 transition-colors flex-shrink-0 mt-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="spinner spinner-dark block" />
                ) : (
                  <ArrowRight size={20} />
                )}
              </button>
            </div>
          </form>

          <p className="text-white/30 text-xs mt-3 px-4 max-w-lg">
            Scout will analyze your request, formulate sub-questions, crawl the web, evaluate sources, and compile a cited report in real-time.
          </p>
        </div>
      </div>

      {/* Spacer to create scroll height to reveal the footer */}
      <div className="h-[20vh] relative z-10 pointer-events-none" />

      {/* Sliding Reveal Footer */}
      <footer
        className={`fixed bottom-0 left-0 right-0 z-20 py-4 px-8 border-t border-white/5 bg-black/60 backdrop-blur-md transition-all duration-500 ease-in-out flex flex-col sm:flex-row items-center justify-between gap-4 ${showFooter ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'
          }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-xs">© 2026 Scout Inc. All rights reserved.</span>
        </div>
        {/* <div className="flex items-center gap-6">
          <a href="#" className="text-white/40 hover:text-white transition-colors text-xs">Features</a>
          <a href="#" className="text-white/40 hover:text-white transition-colors text-xs">Pricing</a>
          <a href="#" className="text-white/40 hover:text-white transition-colors text-xs">Privacy</a>
        </div> */}
        <div className="flex items-center gap-4">
          <a href="https://x.com/ArchitSa" aria-label="Twitter" className="liquid-glass rounded-full p-2 text-white/60 hover:text-white hover:bg-white/5 transition-all">
            <span className="text-xs font-semibold px-1">Twitter</span>
          </a>
          <a href="https://github.com/archit2610/Scout" aria-label="GitHub" className="liquid-glass rounded-full p-2 text-white/60 hover:text-white hover:bg-white/5 transition-all">
            <span className="text-xs font-semibold px-1">GitHub</span>
          </a>
          <a href="https://www.linkedin.com/in/archit-sarawagi-6b73872bb/" aria-label="LinkedIn" className="liquid-glass rounded-full p-2 text-white/60 hover:text-white hover:bg-white/5 transition-all">
            <span className="text-xs font-semibold px-1">LinkedIn</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
