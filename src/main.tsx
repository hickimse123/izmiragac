import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "next-themes";
import "./index.css";
import { TRPCProvider } from "@/providers/trpc";
import { LanguageProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import App from "./App.tsx";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <LanguageProvider>
        <BrowserRouter>
          <TRPCProvider>
            <App />
            <Toaster richColors position="top-center" />
          </TRPCProvider>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);
