import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#0a0a0f',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <h1
            style={{
              color: '#ffffff',
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.875rem',
              marginBottom: '2rem',
              textAlign: 'center',
            }}
          >
            An unexpected error occurred. Please try again.
          </p>
          <a
            href="/dashboard"
            className="scout-btn-primary"
            style={{
              display: 'inline-block',
              maxWidth: '16rem',
              textAlign: 'center',
              textDecoration: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              color: '#000000',
            }}
          >
            Go to dashboard
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}
