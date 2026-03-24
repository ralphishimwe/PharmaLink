import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Top navigation bar used on every page inside Layout.
 * - Desktop (≥ 768px): full horizontal link list
 * - Mobile (< 768px): hamburger button toggles a dropdown menu
 */
function Navbar() {
  const navigate = useNavigate();
  const { role, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isLoggedIn = !!role;
  const isStaff = role === "staff";
  const isUser = role === "user";

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/login");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link
          to={isStaff ? "/staff/inventory" : "/"}
          className="navbar-logo"
          onClick={closeMenu}
        >
          PharmaLink
        </Link>

        {/* ── Desktop nav (hidden on mobile via CSS) ── */}
        {isStaff ? (
          <nav className="navbar-links navbar-links--desktop" aria-label="Staff navigation">
            <Link to="/staff/orders">Orders</Link>
            <Link to="/staff/inventory">Inventory</Link>
            <Link to="/staff/payments">Payments</Link>
          </nav>
        ) : (
          <nav className="navbar-links navbar-links--desktop" aria-label="Main">
            <Link to="/">Home</Link>
            <Link to="/pharmacies">Pharmacies</Link>
            <Link to="/search">Search Medicines</Link>
            <Link to="/orders">Orders</Link>
            {isUser && (
              <Link to="/profile" className="navbar-profile-link" aria-label="Profile">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
          </nav>
        )}

        {/* Desktop login/logout */}
        <div className="navbar-auth--desktop">
          {isLoggedIn ? (
            <button type="button" className="navbar-logout" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <Link to="/login" className="navbar-logout">
              Login
            </Link>
          )}
        </div>

        {/* ── Hamburger button (mobile only) ── */}
        <button
          type="button"
          className={`navbar-hamburger${menuOpen ? " navbar-hamburger--open" : ""}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* ── Mobile dropdown menu ── */}
      {menuOpen && (
        <div className="navbar-mobile-menu">
          {isStaff ? (
            <nav className="navbar-mobile-links">
              <Link to="/staff/orders" onClick={closeMenu}>Orders</Link>
              <Link to="/staff/inventory" onClick={closeMenu}>Inventory</Link>
              <Link to="/staff/payments" onClick={closeMenu}>Payments</Link>
            </nav>
          ) : (
            <nav className="navbar-mobile-links">
              <Link to="/" onClick={closeMenu}>Home</Link>
              <Link to="/pharmacies" onClick={closeMenu}>Pharmacies</Link>
              <Link to="/search" onClick={closeMenu}>Search Medicines</Link>
              <Link to="/orders" onClick={closeMenu}>Orders</Link>
              {isUser && (
                <Link to="/profile" onClick={closeMenu}>Profile</Link>
              )}
            </nav>
          )}

          <div className="navbar-mobile-auth">
            {isLoggedIn ? (
              <button type="button" className="navbar-mobile-logout" onClick={handleLogout}>
                Logout
              </button>
            ) : (
              <Link to="/login" className="navbar-mobile-logout" onClick={closeMenu}>
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
