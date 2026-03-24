import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import PharmaciesPage from "./pages/PharmaciesPage";
import PharmacyDetailPage from "./pages/PharmacyDetailPage";
import SearchPage from "./pages/SearchPage";
import OrdersPage from "./pages/OrdersPage";
import ProfilePage from "./pages/ProfilePage";
import StaffInventoryPage from "./pages/StaffInventoryPage";
import StaffPaymentsPage from "./pages/StaffPaymentsPage";
import StaffLayout from "./components/StaffLayout";
import StaffOrdersPage from "./pages/StaffOrdersPage";
import AdminLayout from "./components/AdminLayout";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminPharmaciesPage from "./pages/AdminPharmaciesPage";
import AdminMedicinesPage from "./pages/AdminMedicinesPage";
import AdminInventoriesPage from "./pages/AdminInventoriesPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminPaymentsPage from "./pages/AdminPaymentsPage";

function App() {
  // role and authReady come from AuthContext — reactive across the whole tree.
  // Whenever login/logout/signup calls setRole(), this component re-renders
  // immediately and the correct route guards evaluate without a page reload.
  const { role, authReady } = useAuth();

  if (!authReady) {
    return <div style={{ padding: "24px" }}>Loading...</div>;
  }

  const isStaff = role === "staff";
  const isAdmin = role === "admin";

  return (
    <Routes>
      {/* All pages share Navbar + Footer via Layout */}
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            isAdmin ? (
              <Navigate to="/admin/users" replace />
            ) : isStaff ? (
              <Navigate to="/staff/inventory" replace />
            ) : (
              <HomePage />
            )
          }
        />
        <Route
          path="/pharmacies"
          element={
            isStaff ? <Navigate to="/staff/inventory" replace /> : <PharmaciesPage />
          }
        />
        <Route
          path="/pharmacies/:id"
          element={
            isStaff ? <Navigate to="/staff/inventory" replace /> : <PharmacyDetailPage />
          }
        />
        <Route
          path="/search"
          element={isStaff ? <Navigate to="/staff/inventory" replace /> : <SearchPage />}
        />
        <Route
          path="/orders"
          element={
            isStaff ? <Navigate to="/staff/orders" replace /> : <OrdersPage />
          }
        />
        <Route
          path="/profile"
          element={
            isStaff ? <Navigate to="/staff/inventory" replace /> : <ProfilePage />
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      {/* Staff-only dashboard layout */}
      <Route element={<StaffLayout />}>
        <Route
          path="/staff/orders"
          element={isStaff ? <StaffOrdersPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/staff/inventory"
          element={isStaff ? <StaffInventoryPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/staff/payments"
          element={isStaff ? <StaffPaymentsPage /> : <Navigate to="/" replace />}
        />
      </Route>

      {/* Admin dashboard layout */}
      <Route element={<AdminLayout />}>
        <Route
          path="/admin/users"
          element={isAdmin ? <AdminUsersPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/admin/pharmacies"
          element={isAdmin ? <AdminPharmaciesPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/admin/medicines"
          element={isAdmin ? <AdminMedicinesPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/admin/inventories"
          element={isAdmin ? <AdminInventoriesPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/admin/orders"
          element={isAdmin ? <AdminOrdersPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/admin/payments"
          element={isAdmin ? <AdminPaymentsPage /> : <Navigate to="/" replace />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
