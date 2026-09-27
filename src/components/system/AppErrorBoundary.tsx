import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Terjadi kesalahan tak terduga.",
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error("Unhandled RekamMedisku render error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4 py-8">
        <div className="w-full max-w-lg rounded-3xl border border-rose-100 bg-white p-6 shadow-[0_18px_50px_-28px_rgba(16,42,86,0.28)] sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600">
            RekamMedisku mengalami error
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
            Halaman tidak dapat ditampilkan
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Kesalahan ini ditangkap supaya satu komponen yang rusak tidak
            menjatuhkan seluruh sesi aplikasi.
          </p>
          {this.state.message ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
              {this.state.message}
            </div>
          ) : null}
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-5 min-h-11 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-600"
          >
            Muat Ulang Aplikasi
          </button>
        </div>
      </main>
    );
  }
}
