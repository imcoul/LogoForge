import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  public componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    this.setState({ hasError: true, error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)) });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-3xl flex items-center justify-center mb-8 rotate-12">
            <AlertTriangle size={48} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mb-4">Something went wrong</h1>
          <p className="text-neutral-500 dark:text-zinc-400 mb-8 max-w-md">
            The application encountered an unexpected error. Please refresh the page to try again.
          </p>
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl p-4 w-full max-w-2xl text-left overflow-auto mb-8 text-xs font-mono text-red-500">
            {this.state.error?.message}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            <RefreshCw size={18} /> Reload Application
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
