import type { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import LoginPage from "../../pages/auth/LoginPage";

type AuthGateProps = {
  children: ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4">
        <div className="text-center">
          <div
            aria-hidden="true"
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#1677FF]"
          />
          <p className="mt-3 text-sm font-medium text-slate-500">
            Memuat RekamMedisku...
          </p>
        </div>
      </main>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
