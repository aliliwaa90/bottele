import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import App from "./App";
import "@/lib/i18n";
import "@/styles/premium.css";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Toaster richColors position="top-center" />
  </StrictMode>
);
