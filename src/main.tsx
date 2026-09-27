import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import AuthGate from "./components/auth/AuthGate";
import AppErrorBoundary from "./components/system/AppErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthGate>
        <App />
      </AuthGate>
    </AppErrorBoundary>
  </StrictMode>,
);
