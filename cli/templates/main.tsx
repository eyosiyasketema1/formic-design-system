import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import CustomizeNudge from "./CustomizeNudge";

/* main.tsx stays as it is. The nudge sits beside the app, not inside it, so
   it survives whatever the AI tool makes of App.tsx; delete its two lines
   here once the look is yours. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <CustomizeNudge />
  </StrictMode>,
);
