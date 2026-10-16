import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Props = {
  resetKey: string;
  children: ReactNode;
};

type State = { failed: boolean };

/** Keeps a page error on that page instead of blanking the whole app. */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center bg-white p-6">
        <div className="max-w-md rounded-xl border border-[#E8ECF1] bg-white p-6 text-center shadow-sm">
          <p className="text-[15px] font-semibold text-[#151D2B]">This page could not be opened</p>
          <p className="mt-1 text-[13px] text-[#6F7B8C]">
            The rest of Samtal is still signed in. Open the member list to continue.
          </p>
          <Link
            to="/app/settings/members"
            className="mt-4 inline-flex h-9 items-center rounded-xl bg-[#016BE6] px-4 text-[13px] font-semibold text-white hover:bg-[#0056EF]"
          >
            View members
          </Link>
        </div>
      </div>
    );
  }
}
