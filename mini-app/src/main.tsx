import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { Toaster } from "sonner";

import App from "@/App";
import "@/lib/i18n";
import "@/index.css";

const manifestUrl =
  import.meta.env.VITE_TON_MANIFEST_URL ?? "http://localhost:5173/tonconnect-manifest.json";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <App />
      <Toaster richColors position="top-center" />
    </TonConnectUIProvider>
  </StrictMode>
);
