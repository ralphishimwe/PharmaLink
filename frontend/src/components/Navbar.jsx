import { Link, useNavigate } from "react-router-dom";

/**
 * Top navigation bar used on every page inside Layout.
 * Logout is UI-only for now (no backend / clear token yet).
 */
function Navbar() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const isStaff = role === "staff";

  const handleLogout = () => {
    // Simple logout: clear token and redirect to login page.
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link
          to={isStaff ? "/staff/inventory" : "/"}
          className="navbar-logo"
        >
          PharmaLink
        </Link>

        {isStaff ? (
          <nav className="navbar-links" aria-label="Staff navigation">
            <Link to="/staff/orders">Orders</Link>
            <Link to="/staff/inventory">Inventory</Link>
            <Link to="/staff/payments">Payments</Link>
          </nav>
        ) : (
          <nav className="navbar-links" aria-label="Main">
            <Link to="/">Home</Link>
            <Link to="/pharmacies">Pharmacies</Link>
            <Link to="/search">Search Medicines</Link>
            <Link to="/orders">Orders</Link>
            <Link
              to="/profile"
              className="navbar-profile-link"
              aria-label="Profile"
            >
              {/* Simple user icon */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 21a8 8 0 0 0-16 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </nav>
        )}

        <button type="button" className="navbar-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
