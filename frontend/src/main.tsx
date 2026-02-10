import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";
import { Buffer } from "buffer";

// Polyfill Buffer for rsrcdump-ts v1.0.4 (still requires Buffer in browser)
if (typeof window !== "undefined") {
  (window as typeof window & { Buffer: typeof Buffer }).Buffer = Buffer;
}

// Enable dark mode
document.documentElement.classList.add('dark');

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found - cannot render app");
  // Create a fallback error message in the body
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Error: Root element not found. Cannot render application.</div>';
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
