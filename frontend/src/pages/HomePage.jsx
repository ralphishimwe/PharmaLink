import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import heroImg from "../assets/hero.png";

/**
 * Home page: redesigned with hero + how-it-works + featured pharmacies +
 * features + CTA sections.
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
        if (!Array.isArray(list)) throw new Error("Unexpected response from server");
        if (!cancelled) setFeatured(list.slice(0, 4));
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || err.message || "Could not load pharmacies.");
        setFeatured([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFeatured();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="home">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-inner">

          {/* Text */}
          <div className="home-hero-text">
            <div className="home-hero-badge">🇷🇼 Rwanda's Pharmacy Network</div>
            <h1 id="home-hero-title">
              Find Medicines from<br />
              <span>Local Pharmacies</span>
            </h1>
            <p className="home-hero-subtitle">
              PharmaLink connects you with pharmacies near you. Search for medicines,
              check availability, and place orders all from one place.
            </p>
            <div className="home-hero-actions">
              <Link to="/search" className="home-hero-btn-primary">
                Browse Medicines
              </Link>
              <Link to="/pharmacies" className="home-hero-btn-secondary">
                View Pharmacies
              </Link>
            </div>
          </div>

          {/* Image */}
          <div className="home-hero-image" aria-hidden="true">
            <img src={heroImg} alt="PharmaLink illustration" />
          </div>

        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section className="home-how" aria-labelledby="home-how-title">
        <div className="home-how-inner">
          <p className="home-section-label">Simple &amp; Fast</p>
          <h2 className="home-section-title" id="home-how-title">How PharmaLink Works</h2>
          <p className="home-section-sub">
            Get your medicines in three easy steps, no queues, no guesswork.
          </p>

          <div className="home-steps">

            <article className="home-step">
              <span className="home-step-number">1</span>
              <div className="home-step-icon">🔍</div>
              <h3>Search Medicines</h3>
              <p>
                Type the medicine name and instantly see which local pharmacies
                have it in stock.
              </p>
            </article>

            <article className="home-step">
              <span className="home-step-number">2</span>
              <div className="home-step-icon">🏪</div>
              <h3>Choose a Pharmacy</h3>
              <p>
                Compare prices, opening hours, and proximity to pick the
                pharmacy that suits you best.
              </p>
            </article>

            <article className="home-step">
              <span className="home-step-number">3</span>
              <div className="home-step-icon">📦</div>
              <h3>Place Your Order</h3>
              <p>
                Order online and pay securely. Your medicines will be ready
                for pickup or delivery.
              </p>
            </article>

          </div>
        </div>
      </section>

      {/* ── FEATURED PHARMACIES ───────────────────────────────── */}
      <section className="home-featured" aria-labelledby="home-featured-title">
        <div className="home-featured-inner">
          <p className="home-section-label">Top Picks</p>
          <h2 className="home-section-title" id="home-featured-title">Featured Pharmacies</h2>
          <p className="home-section-sub">
            Trusted local pharmacies ready to serve you. Browse their inventory and
            place an order today.
          </p>

          {loading && <p className="home-pharmacy-empty">Loading pharmacies…</p>}
          {error && <p style={{ color: "#b91c1c", textAlign: "center" }}>{error}</p>}

          {!loading && !error && (
            <>
              {featured.length === 0 ? (
                <p className="home-pharmacy-empty">No pharmacies available yet.</p>
              ) : (
                <div className="home-pharmacy-grid">
                  {featured.map((pharmacy) => (
                    <article key={pharmacy._id} className="home-pharmacy-card">
                      <div className="home-pharmacy-card-icon">🏥</div>
                      <h3>{pharmacy.name}</h3>
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

              <div style={{ textAlign: "center", marginTop: "36px" }}>
                <Link to="/pharmacies" className="home-hero-btn-primary">
                  See All Pharmacies
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── WHY PHARMALINK ────────────────────────────────────── */}
      <section className="home-features" aria-labelledby="home-features-title">
        <div className="home-features-inner">
          <p className="home-section-label">Why Choose Us</p>
          <h2 className="home-section-title" id="home-features-title">
            Everything You Need in One Place
          </h2>
          <p className="home-section-sub">
            PharmaLink makes managing your health needs simple, fast, and reliable.
          </p>

          <div className="home-features-grid">

            <div className="home-feature-card">
              <div className="home-feature-icon home-feature-icon--blue">💊</div>
              <h3>Real-Time Inventory</h3>
              <p>
                Know exactly which medicines are in stock at each pharmacy
                before you leave home, no wasted trips.
              </p>
            </div>

            <div className="home-feature-card">
              <div className="home-feature-icon home-feature-icon--purple">🔒</div>
              <h3>Secure Payments</h3>
              <p>
                Pay for your orders securely online. All transactions are
                protected and fully traceable.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION ────────────────────────────────────── */}
      <section className="home-cta" aria-labelledby="home-cta-title">
        <div className="home-cta-inner">
          <h2 id="home-cta-title">Ready to Get Started?</h2>
          <p>
            Create a free account today and start finding medicines from
            local pharmacies in seconds.
          </p>
          <Link to="/signup" className="home-cta-btn">
            Create Free Account
          </Link>
        </div>
      </section>

    </div>
  );
}

export default HomePage;
