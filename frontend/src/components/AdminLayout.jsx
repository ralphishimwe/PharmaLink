import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/adminLayout.css";

function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `admin-sidebar-link${isActive ? " admin-sidebar-link--active" : ""}`;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">Admin</h2>
        <nav className="admin-sidebar-nav" aria-label="Admin navigation">
          <NavLink to="/admin/users" className={linkClass}>
            Users
          </NavLink>
          <NavLink to="/admin/pharmacies" className={linkClass}>
            Pharmacies
          </NavLink>
          <NavLink to="/admin/medicines" className={linkClass}>
            Medicines
          </NavLink>
          <NavLink to="/admin/inventories" className={linkClass}>
            Inventories
          </NavLink>
          <NavLink to="/admin/orders" className={linkClass}>
            Orders
          </NavLink>
          <NavLink to="/admin/payments" className={linkClass}>
            Payments
          </NavLink>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>Admin Dashboard</h1>
          <button className="admin-header-logout" onClick={handleLogout}>
            Logout
          </button>
        </header>
        <section className="admin-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default AdminLayout;

