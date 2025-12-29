import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";
import { Buffer } from "buffer";

// Polyfill Buffer for browser compatibility
if (typeof window !== "undefined") {
  (window as typeof window & { Buffer: typeof Buffer }).Buffer = Buffer;
}

// Enable dark mode
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
