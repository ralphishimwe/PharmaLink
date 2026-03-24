import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./styles/auth.css";
import "./styles/layout.css";
import "./styles/home.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* BrowserRouter enables route navigation in the app */}
    <BrowserRouter>
      {/* AuthProvider makes role state available to every component in the tree */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
