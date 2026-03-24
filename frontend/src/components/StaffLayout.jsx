import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import api from "../utils/api";
import "../styles/staffLayout.css";

function StaffLayout() {
  const [pharmacyName, setPharmacyName] = useState("");
  const [loadingPharmacy, setLoadingPharmacy] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoadingPharmacy(true);
        const res = await api.get("/pharmacies/my");
        const name = res.data?.data?.data?.name || "";
        if (!cancelled) setPharmacyName(name);
      } catch (err) {
        if (!cancelled) setPharmacyName("");
      } finally {
        if (!cancelled) setLoadingPharmacy(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="staff-layout">
      <Navbar />

      <main className="staff-main">
        <header className="staff-main-header">
          <h1 className="staff-main-title">Staff Dashboard</h1>
          <div className="staff-main-pharmacy">
            {loadingPharmacy ? "Loading…" : pharmacyName || "—"}
          </div>
        </header>

        <div className="staff-content">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default StaffLayout;

