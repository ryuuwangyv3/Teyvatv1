
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component to catch and handle UI rendering errors and unhandled promise rejections.
 */
class ErrorBoundary extends Component<Props, State> {
  // Fix: Explicitly declare state and props to resolve "Property does not exist on type 'ErrorBoundary'" errors.
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    // Fix: Initialize state and assign props to satisfy type checker.
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
    this.handlePromiseRejection = this.handlePromiseRejection.bind(this);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Akasha Core Exception:", error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  handlePromiseRejection(event: PromiseRejectionEvent) {
    // Fix: Use type assertion for setState to resolve existence error when inheritance is not fully recognized.
    (this as any).setState({
      hasError: true,
      error: event.reason instanceof Error ? event.reason : new Error(String(event.reason || 'Unhandled Async Error'))
    });
  }

  render(): ReactNode {
    // Fix: Access state property correctly.
    const { hasError, error } = this.state;

    if (hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0b0e14] text-[#ece5d8] p-6 text-center relative overflow-hidden z-[9999]">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-900/20 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="genshin-panel p-10 rounded-3xl border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)] max-w-lg w-full relative z-10 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 mx-auto animate-pulse">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold font-serif mb-2 tracking-[0.2em] uppercase text-red-400">
              Neural Interruption
            </h1>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed italic">
              "The Akasha Terminal encountered a celestial anomaly. Re-syncing with Irminsul is required."
            </p>

            <div className="bg-black/40 p-4 rounded-xl mb-8 border border-white/5 text-[10px] font-mono text-left text-red-300 max-h-32 overflow-y-auto custom-scrollbar">
               <span className="opacity-50 select-none">$ CRASH_DUMP: </span>
               {error?.toString() || "Unknown Anomaly"}
            </div>

            <div className="flex flex-col gap-3">
                <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-3 bg-amber-500 text-black border border-amber-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2 hover:bg-amber-400"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Attempt Re-Sync (Reload)</span>
                </button>
                
                <button 
                    onClick={() => {
                        localStorage.clear(); 
                        window.location.reload();
                    }}
                    className="w-full py-3 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/30 rounded-xl text-red-400 font-bold transition-all flex items-center justify-center gap-2"
                >
                    <Terminal className="w-4 h-4" />
                    <span>Hard Reset (Purge Memory)</span>
                </button>
            </div>
            <p className="mt-6 text-[9px] text-gray-600 uppercase tracking-widest">
                System Status: CRITICAL_FAILURE_E0
            </p>
          </div>
        </div>
      );
    }

    // Fix: Access props property correctly.
    return this.props.children;
  }
}

export default ErrorBoundary;
