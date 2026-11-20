import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar.jsx";
import Header from "../components/Header.jsx";

export default function AppLayout() {
  return (
    <div className="app">
      <Sidebar />

      <div className="app-main">
        <Header />

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}