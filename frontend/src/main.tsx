import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";
import { Buffer } from "buffer";

// Polyfill Buffer for rsrcdump-ts v1.0.4 (still requires Buffer in browser)
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

// Enable dark mode
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
