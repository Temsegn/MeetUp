import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type Props = { children: ReactNode; resetKey?: string };
type State = { error: Error | null };

/**
 * Catches render errors so one broken page shows a recoverable message
 * instead of blanking the entire app. Resets when `resetKey` changes
 * (e.g. on navigation), so moving to another page recovers automatically.
 */
class ErrorBoundaryInner extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(prev: Props): void {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const isChunkError = /Loading chunk|dynamically imported module|Importing a module script/i.test(
      this.state.error.message,
    );
    return (
      <div role="alert" className="flex min-h-[60vh] items-center justify-center bg-[#F7F9FC] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#E8ECF1] bg-white p-6 text-center shadow-sm">
          <h1 className="text-[17px] font-bold text-[#151D2B]">
            {isChunkError ? 'A new version is available' : 'Something went wrong'}
          </h1>
          <p className="mt-1.5 text-[13px] text-[#64748B]">
            {isChunkError
              ? 'Reload to get the latest version of Samtal.'
              : 'This page hit an unexpected error. Your data is safe.'}
          </p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-10 flex-1 rounded-xl bg-[#016BE6] text-[13px] font-semibold text-white hover:bg-[#0159C7]"
            >
              Reload
            </button>
            {!isChunkError ? (
              <button
                type="button"
                onClick={() => this.setState({ error: null })}
                className="h-10 flex-1 rounded-xl border border-[#E0E7EE] text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"
              >
                Try again
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}

/** Router-aware boundary: navigating to another page clears the error. */
export function ErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundaryInner resetKey={pathname}>{children}</ErrorBoundaryInner>;
}
