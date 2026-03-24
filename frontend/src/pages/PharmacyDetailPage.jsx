import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import "../styles/pharmacies.css";

/** Placeholder when a medicine has no image in the database */
const MEDICINE_PLACEHOLDER =
  "https://placehold.co/280x180/e2e8f0/64748b?text=Medicine";

function resolveImageUrl(image) {
  if (!image) return MEDICINE_PLACEHOLDER;
  // Already a full URL (e.g. https://…)
  if (typeof image === "string" && image.startsWith("http")) return image;
  // Local file dropped in public/medicines/ — served by Vite at /medicines/<filename>
  const filename = typeof image === "string" ? image.replace(/^.*[\\/]/, "") : "";
  return `/medicines/${filename}`;
}

/**
 * Pharmacy profile + inventory.
 * Buy Now: creates order (POST /orders/place) then opens Stripe (POST /payments/initiate).
 */
function PharmacyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pharmacy, setPharmacy] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [loadingPharmacy, setLoadingPharmacy] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [errorPharmacy, setErrorPharmacy] = useState("");
  const [errorInventory, setErrorInventory] = useState("");
  const [actionError, setActionError] = useState("");

  // Auto-dismiss action error after 6 seconds so stale messages don't persist
  // when the user scrolls to a different item without retrying.
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(""), 6000);
    return () => clearTimeout(t);
  }, [actionError]);

  const [buyingMedicineId, setBuyingMedicineId] = useState(null);

  const loadPharmacy = useCallback(async () => {
    try {
      setLoadingPharmacy(true);
      setErrorPharmacy("");
      const res = await api.get(`/pharmacies/${id}`);
      const doc = res.data?.data?.data;
      if (!doc) throw new Error("Pharmacy not found");
      setPharmacy(doc);
    } catch (err) {
      setErrorPharmacy(
        err.response?.data?.message ||
          err.message ||
          "Could not load pharmacy.",
      );
      setPharmacy(null);
    } finally {
      setLoadingPharmacy(false);
    }
  }, [id]);

  const loadInventory = useCallback(async () => {
    try {
      setLoadingInventory(true);
      setErrorInventory("");
      const res = await api.get(`/pharmacies/${id}/inventories`);
      const list = res.data?.data;
      setInventory(Array.isArray(list) ? list : []);
    } catch (err) {
      setErrorInventory(
        err.response?.data?.message ||
          err.message ||
          "Could not load inventory.",
      );
      setInventory([]);
    } finally {
      setLoadingInventory(false);
    }
  }, [id]);

  useEffect(() => {
    loadPharmacy();
    loadInventory();
  }, [loadPharmacy, loadInventory]);

  const handleBuyNow = async (item) => {
    setActionError("");

    if (!localStorage.getItem("token")) {
      navigate("/login", { state: { from: `/pharmacies/${id}` } });
      return;
    }

    if (!deliveryAddress.trim()) {
      setActionError("Please enter a delivery address before buying.");
      return;
    }

    if (!item.medicineId) {
      setActionError("This item cannot be ordered (missing medicine id).");
      return;
    }

    if (item.quantity <= 0) {
      setActionError("This item is out of stock.");
      return;
    }

    const medicineId =
      typeof item.medicineId === "object"
        ? item.medicineId.toString?.() || item.medicineId._id
        : item.medicineId;

    try {
      setBuyingMedicineId(String(medicineId));
      // 1) Create order (single line, qty 1) — backend prices from inventory
      const orderRes = await api.post("/orders/place", {
        pharmacyId: id,
        deliveryAddress: deliveryAddress.trim(),
        items: [{ medicineId, quantity: 1 }],
      });

      const orderId = orderRes.data?.data?.orderId;
      if (!orderId) throw new Error("No orderId returned");

      // Save the order id so the Orders page knows which card to refresh.
      localStorage.setItem("lastPaymentOrderId", String(orderId));

      // 2) Start Stripe checkout
      const payRes = await api.post("/payments/initiate", { orderId });
      const checkoutUrl = payRes.data?.data?.checkoutUrl;

      if (!checkoutUrl) {
        throw new Error("No checkout URL returned from payment service");
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        navigate("/login", { state: { from: `/pharmacies/${id}` } });
        return;
      }
      setActionError(
        err.response?.data?.message ||
          err.message ||
          "Could not start checkout. Please try again.",
      );
    } finally {
      setBuyingMedicineId(null);
    }
  };

  return (
    <div className="pharmacies-page pharmacy-detail-page">
      <p className="pharmacies-back">
        <Link to="/pharmacies">← Back to Pharmacies</Link>
      </p>

      {loadingPharmacy && (
        <p className="pharmacies-status" role="status">
          Loading pharmacy information…
        </p>
      )}

      {errorPharmacy && (
        <p className="pharmacies-error" role="alert">
          {errorPharmacy}
        </p>
      )}

      {!loadingPharmacy && pharmacy && (
        <header className="pharmacy-banner">
          <h1 className="pharmacy-banner-title">{pharmacy.name}</h1>
          <div className="pharmacy-banner-grid">
            <div>
              <span className="pharmacy-banner-label">Address</span>
              <p>{pharmacy.address}</p>
            </div>
            <div>
              <span className="pharmacy-banner-label">Opening hours</span>
              <p>{pharmacy.openingHours}</p>
            </div>
            <div>
              <span className="pharmacy-banner-label">Email</span>
              <p>
                <a href={`mailto:${pharmacy.email}`}>{pharmacy.email}</a>
              </p>
            </div>
            <div>
              <span className="pharmacy-banner-label">Phone</span>
              <p>
                <a href={`tel:${pharmacy.phone}`}>{String(pharmacy.phone)}</a>
              </p>
            </div>
          </div>
        </header>
      )}

      {!loadingPharmacy && pharmacy && (
        <section className="pharmacy-delivery" aria-label="Delivery address">
          <label htmlFor="delivery-address">Delivery address for orders</label>
          <textarea
            id="delivery-address"
            rows={3}
            placeholder="e.g. KG 123 St, Kigali, Rwanda"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
          />
          <p className="pharmacy-delivery-hint">
            Required before &quot;Buy Now&quot;. Same address is used for each
            purchase from this page.
          </p>
        </section>
      )}

      {actionError && (
        <p className="pharmacies-error" role="alert">
          {actionError}
        </p>
      )}

      <section className="pharmacy-inventory-section">
        <h2 className="pharmacy-inventory-heading">Medicines in stock</h2>

        {loadingInventory && (
          <p className="pharmacies-status" role="status">
            Loading inventory…
          </p>
        )}

        {errorInventory && (
          <p className="pharmacies-error" role="alert">
            {errorInventory}
          </p>
        )}

        {!loadingInventory && !errorInventory && inventory.length === 0 && (
          <p className="pharmacies-status">No medicines listed for this pharmacy.</p>
        )}

        {!loadingInventory && !errorInventory && inventory.length > 0 && (
          <ul className="inventory-medicine-grid">
            {inventory.map((item) => {
              const key =
                item.inventoryId ||
                item.medicineId ||
                `${item.medicineName}-${item.price}`;
              const imgSrc = resolveImageUrl(item.image);
              const inStock = item.quantity > 0;
              const mid =
                typeof item.medicineId === "object"
                  ? item.medicineId?._id || item.medicineId
                  : item.medicineId;
              const isBuying =
                buyingMedicineId !== null &&
                String(mid) === buyingMedicineId;

              return (
                <li key={String(key)}>
                  <article className="inventory-medicine-card">
                    <div className="inventory-medicine-image-wrap">
                      <img
                        src={imgSrc}
                        alt=""
                        className="inventory-medicine-image"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = MEDICINE_PLACEHOLDER;
                        }}
                      />
                    </div>
                    <h3 className="inventory-medicine-name">
                      {item.medicineName}
                      {item.dosageForm ? (
                        <span className="inventory-medicine-form">
                          {" "}
                          · {item.dosageForm}
                        </span>
                      ) : null}
                    </h3>
                    <p className="inventory-medicine-price">
                      {Number(item.price).toLocaleString()} RWF
                    </p>
                    <p
                      className={
                        inStock
                          ? "inventory-stock inventory-stock--yes"
                          : "inventory-stock inventory-stock--no"
                      }
                    >
                      {inStock ? "In Stock" : "Out of stock"}
                    </p>
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
      </section>
    </div>
  );
}

export default PharmacyDetailPage;
