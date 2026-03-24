import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import "../styles/search.css";
import "../styles/pharmacies.css";

const MEDICINE_PLACEHOLDER =
  "https://placehold.co/280x180/e2e8f0/64748b?text=Medicine";

function resolveImageUrl(image) {
  if (!image) return MEDICINE_PLACEHOLDER;
  if (typeof image === "string" && image.startsWith("http")) return image;
  const filename = typeof image === "string" ? image.replace(/^.*[\\/]/, "") : "";
  return `/medicines/${filename}`;
}

/**
 * Sort options → query params for GET /medicines/search
 */
const SORT_OPTIONS = [
  { label: "Price: low to high", sort: "price", order: "asc" },
  { label: "Price: high to low", sort: "price", order: "desc" },
  { label: "Medicine name (A–Z)", sort: "medicine", order: "asc" },
  { label: "Pharmacy name (A–Z)", sort: "pharmacy", order: "asc" },
];

function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("0");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const [actionError, setActionError] = useState("");
  const [buyingKey, setBuyingKey] = useState(null);

  async function fetchSearch(name, sortIndexStr) {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a medicine name to search.");
      setResults([]);
      setSearched(false);
      return;
    }

    const opt = SORT_OPTIONS[Number(sortIndexStr)] || SORT_OPTIONS[0];

    try {
      setLoading(true);
      setError("");
      setActionError("");
      const res = await api.get("/medicines/search", {
        params: {
          name: trimmed,
          sort: opt.sort,
          order: opt.order,
        },
      });
      const list = res.data?.data;
      setResults(Array.isArray(list) ? list : []);
      setSearched(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Search failed. Please try again.",
      );
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchSearch(query, sortKey);
  };

  const handleSortChange = (e) => {
    const nextKey = e.target.value;
    setSortKey(nextKey);
    if (searched && query.trim()) {
      fetchSearch(query, nextKey);
    }
  };

  const handleBuyNow = async (item) => {
    setActionError("");

    if (!localStorage.getItem("token")) {
      navigate("/login", { state: { from: "/search" } });
      return;
    }

    if (!deliveryAddress.trim()) {
      setActionError("Please enter a delivery address before buying.");
      return;
    }

    const pharmacyId =
      typeof item.pharmacyId === "object"
        ? item.pharmacyId?._id ?? item.pharmacyId
        : item.pharmacyId;
    const medicineId =
      typeof item.medicineId === "object"
        ? item.medicineId?._id ?? item.medicineId
        : item.medicineId;

    if (!pharmacyId || !medicineId) {
      setActionError("Missing pharmacy or medicine information for this offer.");
      return;
    }

    if (item.quantity <= 0) {
      setActionError("This item is out of stock.");
      return;
    }

    const rowKey = `${pharmacyId}-${medicineId}-${item.price}`;

    try {
      setBuyingKey(rowKey);
      const orderRes = await api.post("/orders/place", {
        pharmacyId: String(pharmacyId),
        deliveryAddress: deliveryAddress.trim(),
        items: [{ medicineId: String(medicineId), quantity: 1 }],
      });

      const orderId = orderRes.data?.data?.orderId;
      if (!orderId) throw new Error("No orderId returned");

      // Save the order id so the Orders page knows which card to refresh.
      localStorage.setItem("lastPaymentOrderId", String(orderId));

      const payRes = await api.post("/payments/initiate", { orderId });
      const checkoutUrl = payRes.data?.data?.checkoutUrl;
      if (!checkoutUrl) throw new Error("No checkout URL returned");

      window.location.href = checkoutUrl;
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login", { state: { from: "/search" } });
        return;
      }
      setActionError(
        err.response?.data?.message ||
          err.message ||
          "Could not start checkout. Please try again.",
      );
    } finally {
      setBuyingKey(null);
    }
  };

  return (
    <div className="search-page">
      <header className="search-page-header">
        <h1>Search medicines</h1>
        <p className="search-page-intro">
          Compare prices across pharmacies. Results show only listings that are
          in stock.
        </p>
      </header>

      <form className="search-bar" onSubmit={handleSubmit}>
        <label htmlFor="medicine-search" className="visually-hidden">
          Medicine name
        </label>
        <input
          id="medicine-search"
          type="search"
          placeholder="e.g. Paracetamol"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      <div className="search-controls">
        <label htmlFor="search-sort">Sort by</label>
        <select
          id="search-sort"
          value={sortKey}
          onChange={handleSortChange}
          disabled={loading}
        >
          {SORT_OPTIONS.map((opt, i) => (
            <option key={opt.label} value={String(i)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <section className="search-delivery" aria-label="Delivery address">
        <label htmlFor="search-delivery-address">Delivery address</label>
        <textarea
          id="search-delivery-address"
          rows={2}
          placeholder="Used when you click Buy Now"
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
        />
      </section>

      {actionError && (
        <p className="search-error search-error--action" role="alert">
          {actionError}
        </p>
      )}

      {loading && (
        <p className="search-status" role="status">
          Loading results…
        </p>
      )}

      {!loading && error && (
        <p className="search-error" role="alert">
          {error}
        </p>
      )}

      {!loading && searched && !error && results.length === 0 && (
        <p className="search-status">No matches found. Try another name.</p>
      )}

      {!loading && results.length > 0 && (
        <ul className="inventory-medicine-grid">
          {results.map((item) => {
            const pharmacyId =
              typeof item.pharmacyId === "object"
                ? item.pharmacyId?._id ?? item.pharmacyId
                : item.pharmacyId;
            const medicineId =
              typeof item.medicineId === "object"
                ? item.medicineId?._id ?? item.medicineId
                : item.medicineId;
            const rowKey = `${pharmacyId}-${medicineId}-${item.price}`;
            const inStock = item.quantity > 0;
            const isBuying = buyingKey === rowKey;
            const imgSrc = resolveImageUrl(item.image);

            return (
              <li key={item.inventoryId || rowKey}>
                <article className="inventory-medicine-card">
                  <div className="inventory-medicine-image-wrap">
                    <img
                      src={imgSrc}
                      alt=""
                      className="inventory-medicine-image"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = MEDICINE_PLACEHOLDER; }}
                    />
                  </div>
                  <h3 className="inventory-medicine-name">
                    {item.medicineName}
                    {item.dosageForm && (
                      <span className="inventory-medicine-form"> · {item.dosageForm}</span>
                    )}
                  </h3>
                  <p className="inventory-medicine-price">
                    {Number(item.price).toLocaleString()} RWF
                  </p>
                  <p className="search-result-pharmacy">{item.pharmacyName}</p>
                  <p className="search-result-address">{item.pharmacyAddress}</p>
                  <p className={inStock ? "inventory-stock inventory-stock--yes" : "inventory-stock inventory-stock--no"}>
                    {inStock ? "In stock" : "Out of stock"}
                  </p>
                  <Link
                    to={`/pharmacies/${pharmacyId}`}
                    className="search-btn search-btn--secondary"
                  >
                    View Pharmacy
                  </Link>
                  <button
                    type="button"
                    className="inventory-buy-btn"
                    disabled={!inStock || isBuying}
                    onClick={() => handleBuyNow(item)}
                  >
                    {isBuying ? "Please wait…" : "Buy Now"}
                  </button>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default SearchPage;
