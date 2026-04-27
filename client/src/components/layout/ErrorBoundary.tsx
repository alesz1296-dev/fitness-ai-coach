import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI. Receives the error. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Class-based error boundary — catches unhandled render errors in the tree
 * below it and shows a friendly recovery screen instead of a blank page.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomePage />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // In production you'd send this to Sentry / LogRocket etc.
    console.error("[ErrorBoundary] Unhandled render error:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (!error) return children;

    if (fallback) return fallback(error, this.reset);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl mb-4">
            <span className="text-3xl">⚠️</span>
          </div>

          <h1 className="text-gray-900 dark:text-white text-xl font-bold mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            An unexpected error occurred on this page. Your data is safe — try
            refreshing or go back to the dashboard.
          </p>

          {/* Error detail (collapsible) */}
          <details className="text-left mb-6">
            <summary className="text-xs text-gray-400 cursor-pointer select-none hover:text-gray-500">
              Error details
            </summary>
            <pre className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap break-all">
              {error.message}
            </pre>
          </details>

          <div className="flex gap-3 justify-center">
            <button
              onClick={this.reset}
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
            >
              Try again
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
