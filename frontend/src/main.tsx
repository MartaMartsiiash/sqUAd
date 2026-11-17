import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/auth";
// Fonts are bundled with the site (no third-party requests): all three have Cyrillic.
import "@fontsource/unbounded/cyrillic-400.css";
import "@fontsource/unbounded/cyrillic-600.css";
import "@fontsource/unbounded/cyrillic-800.css";
import "@fontsource/unbounded/latin-400.css";
import "@fontsource/unbounded/latin-600.css";
import "@fontsource/unbounded/latin-800.css";
import "@fontsource/unbounded/latin-900.css";
import "@fontsource/manrope/cyrillic-400.css";
import "@fontsource/manrope/cyrillic-500.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/cyrillic-600.css";
import "@fontsource/manrope/cyrillic-800.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-800.css";
import "@fontsource/jetbrains-mono/cyrillic-400.css";
import "@fontsource/jetbrains-mono/cyrillic-600.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-600.css";
// Script face for the "UA" in the wordmark (Latin only, which is all it needs).
import "@fontsource/yellowtail/latin-400.css";
import "./index.css";
import AuthCallback from "./pages/AuthCallback";
import Home from "./pages/Home";
import Host from "./pages/Host";
import Join from "./pages/Join";
import Room from "./pages/Room";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/host" element={<Host />} />
          <Route path="/join/:code" element={<Join />} />
          <Route path="/room/:code" element={<Room />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
