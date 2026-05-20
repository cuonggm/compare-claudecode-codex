import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

type ErrorBoundaryState = { hasError: boolean; message?: string };

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error("UI error boundary caught", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="dialog-overlay" role="alert">
          <div className="dialog">
            <h2>Ứng dụng gặp sự cố</h2>
            <p>{this.state.message ?? "Vui lòng tải lại trang."}</p>
            <div className="dialog-actions">
              <button type="button" className="primary-button" onClick={() => window.location.reload()}>
                Tải lại trang
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
