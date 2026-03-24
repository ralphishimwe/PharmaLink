import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import "../styles/pharmacies.css";

/**
 * GET /api/v1/pharmacies returns:
 * { status, results, data: { data: Pharmacy[] } }
 */
function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPharmacies() {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/pharmacies");
        const list = response.data?.data?.data;

        if (!Array.isArray(list)) {
          throw new Error("Unexpected response from server");
        }

        if (!cancelled) {
          setPharmacies(list);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err.response?.data?.message ||
            err.message ||
            "Could not load pharmacies. Please try again.";
          setError(message);
          setPharmacies([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPharmacies();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pharmacies-page">
      <header className="pharmacies-page-header">
        <h1>Pharmacies</h1>
        <p className="pharmacies-page-intro">
          Browse registered pharmacies and visit their page for more details.
        </p>
      </header>

      {loading && (
        <p className="pharmacies-status" role="status">
          Loading pharmacies…
        </p>
      )}

      {!loading && error && (
        <p className="pharmacies-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && pharmacies.length === 0 && (
        <p className="pharmacies-status">No pharmacies found.</p>
      )}

      {!loading && !error && pharmacies.length > 0 && (
        <div className="pharmacies-grid">
          {pharmacies.map((pharmacy) => (
            <article key={pharmacy._id} className="home-pharmacy-card">
              <div className="home-pharmacy-card-icon">🏥</div>
              <h3 className="home-pharmacy-card-name">{pharmacy.name}</h3>
              <p className="home-pharmacy-address">{pharmacy.address}</p>
              {pharmacy.openingHours && (
                <p className="home-pharmacy-hours">
                  <span>🕐</span>
                  {pharmacy.openingHours}
                </p>
              )}
              <Link
                to={`/pharmacies/${pharmacy._id}`}
                className="home-pharmacy-btn"
              >
                Visit Pharmacy →
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default PharmaciesPage;
