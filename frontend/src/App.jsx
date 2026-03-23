import { Navigate, Route, Routes } from "react-router-dom";
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

function App() {
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const isStaff = role === "staff";

  return (
    <Routes>
      {/* All pages share Navbar + Footer via Layout */}
      <Route element={<Layout />}>
        <Route
          path="/"
          element={isStaff ? <Navigate to="/staff/inventory" replace /> : <HomePage />}
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
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
