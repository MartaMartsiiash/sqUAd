import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/auth";
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
