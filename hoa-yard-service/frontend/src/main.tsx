import React from "react";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App";

// Точка входа демонстрационная (переключение вкладок без ролевого роутинга) —
// реальный auth-роутинг (ADMIN/CHAIRMAN/CLEANER) собирается в Спринте 1-2
// вместе с backend, см. ROADMAP.md.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
