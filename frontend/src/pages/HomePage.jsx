import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

/**
 * Home page: hero + featured pharmacies pulled from backend.
 * Featured list is limited to 4 pharmacies for now.
 */
function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFeatured() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/pharmacies");
        const list = res.data?.data?.data;
        if (!Array.isArray(list)) {
          throw new Error("Unexpected response from server");
        }

        if (!cancelled) setFeatured(list.slice(0, 4));
      } catch (err) {
        if (cancelled) return;
        setError(
          err.response?.data?.message ||
            err.message ||
            "Could not load pharmacies.",
        );
        setFeatured([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFeatured();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="home">
      {/* Hero */}
      <section className="home-hero" aria-labelledby="home-hero-title">
        <h1 id="home-hero-title">Welcome to PharmaLink</h1>
        <p className="home-hero-subtitle">
          Find and compare medicines from nearby pharmacies
        </p>
      </section>

      {/* Featured pharmacies — responsive grid of cards */}
      <section className="home-featured" aria-labelledby="home-featured-title">
        <h2 id="home-featured-title">Featured Pharmacies</h2>

        {loading && <p>Loading pharmacies…</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

        {!loading && !error && (
          <div className="home-pharmacy-grid">
            {featured.map((pharmacy) => (
              <article
                key={pharmacy._id}
                className="home-pharmacy-card"
              >
                <h3>{pharmacy.name}</h3>
                <p className="home-pharmacy-address">{pharmacy.address}</p>
                <Link
                  to={`/pharmacies/${pharmacy._id}`}
                  className="home-pharmacy-btn"
                >
                  Visit Pharmacy
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default HomePage;
