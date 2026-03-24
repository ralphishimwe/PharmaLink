import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../utils/api";
import "../styles/orders.css";

/**
 * GET /api/v1/orders/my-orders → { data: { data: Order[] } }
 */
function OrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const paymentSuccessFlag = searchParams.get("paymentSuccess") === "1";

  // The order id we created right before redirecting to Stripe.
  // We set this in PharmacyDetailPage and SearchPage.
  const lastPaymentOrderId = localStorage.getItem("lastPaymentOrderId");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const [refreshingOrderId, setRefreshingOrderId] = useState(null);
  const [isRefreshingPayment, setIsRefreshingPayment] = useState(false);
  const alertShownRef = useRef(false);
  const pollCancelledRef = useRef(false);

  // Load orders and return the list so we can poll for payment confirmation.
  const loadOrders = useCallback(
    async ({ silent = false } = {}) => {
    if (!localStorage.getItem("token")) {
      navigate("/login", { state: { from: "/orders" } });
      return [];
    }

    try {
      if (!silent) setLoading(true);
      setError("");

      // Authorization header (JWT) is added by the Axios interceptor,
      // but we also explicitly pass it here for clarity.
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      // User orders only (never call staff endpoint from this page).
      const res = await api.get("/orders/my-orders", { headers });
      const list = res.data?.data?.data;
      const safe = Array.isArray(list) ? list : [];
      setOrders(safe);
      return safe;
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login", { state: { from: "/orders" } });
        return [];
      }
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not load your orders.",
      );
      setOrders([]);
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
    },
    [navigate],
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // If we came back from Stripe checkout, poll until the matching order becomes paid.
  // We only show the JS alert once payment is confirmed (webhook already updated backend).
  useEffect(() => {
    if (!paymentSuccessFlag || !lastPaymentOrderId) return;

    setRefreshingOrderId(lastPaymentOrderId);
    setIsRefreshingPayment(true);
    alertShownRef.current = false;
    pollCancelledRef.current = false;

    let attempts = 0;
    const maxAttempts = 12; // ~36 seconds (12 * 3s)
    const delayMs = 3000;

    const poll = async () => {
      while (attempts < maxAttempts && !pollCancelledRef.current) {
        attempts += 1;
        const list = await loadOrders({ silent: true });

        // Component may have unmounted while the request was in-flight —
        // check the cancel flag before touching any state.
        if (pollCancelledRef.current) return;

        const target = list.find(
          (o) => String(o._id) === String(lastPaymentOrderId),
        );

        if (target?.paymentStatus === "paid") {
          if (!alertShownRef.current) {
            alertShownRef.current = true;
            window.alert("Payment Successful");
            localStorage.removeItem("lastPaymentOrderId");
          }
          setIsRefreshingPayment(false);
          setRefreshingOrderId(null);
          return;
        }

        // Wait before next attempt, but bail immediately if cancelled.
        await new Promise((r) => {
          const t = setTimeout(r, delayMs);
          // If cancelled during the sleep, resolve early.
          const check = setInterval(() => {
            if (pollCancelledRef.current) { clearTimeout(t); clearInterval(check); r(); }
          }, 200);
          setTimeout(() => clearInterval(check), delayMs + 50);
        });
      }

      // If not confirmed within polling window, stop refreshing.
      if (!pollCancelledRef.current) {
        setIsRefreshingPayment(false);
        setRefreshingOrderId(null);
      }
    };

    poll();

    return () => {
      pollCancelledRef.current = true;
    };
  }, [paymentSuccessFlag, lastPaymentOrderId, loadOrders]);

  const handleCancel = async (orderId) => {
    try {
      setCancellingId(orderId);
      setError("");
      await api.patch(`/orders/${orderId}/cancel`);
      await loadOrders();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login", { state: { from: "/orders" } });
        return;
      }
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not cancel this order.",
      );
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="orders-page">
      <header className="orders-page-header">
        <h1>My Orders</h1>
        <p className="orders-page-intro">
          Track payment and delivery status. You can cancel orders that are still pending.
        </p>
      </header>

      {loading && (
        <p className="orders-status" role="status">
          Loading orders…
        </p>
      )}

      {!loading && error && (
        <p className="orders-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && orders.length === 0 && (
        <p className="orders-status">
          You have no orders yet. <Link to="/pharmacies">Browse pharmacies</Link> to get started.
        </p>
      )}

      {!loading && orders.length > 0 && (
        <ul className="orders-grid">
          {orders.map((order) => {
            const id = order._id;
            const isPending = order.orderStatus === "pending";
            const isCancelling = cancellingId === id;
            const isTargetOrder =
              refreshingOrderId && String(id) === String(refreshingOrderId);
            const isRefreshingThisCard =
              paymentSuccessFlag &&
              isTargetOrder &&
              isRefreshingPayment &&
              order.paymentStatus !== "paid";
            const paymentStatus = order.paymentStatus || "unpaid";

            return (
              <li key={id}>
                <article className="order-card">
                  <div className="order-card-row">
                    <span className="order-card-label">Order ID</span>
                    <code className="order-card-id">{id}</code>
                  </div>
                  <div className="order-card-row">
                    <span className="order-card-label">Total</span>
                    <span className="order-card-amount">
                      {Number(order.totalAmount).toLocaleString()} RWF
                    </span>
                  </div>
                  <div className="order-card-row order-card-badges">
                    <span className="order-card-label">Payment</span>
                    <span
                      className={`order-badge order-badge--payment ${
                        isRefreshingThisCard
                          ? "order-badge--refreshing"
                          : `order-badge--${paymentStatus}`
                      }`}
                    >
                      {paymentStatus === "paid"
                        ? "Paid"
                        : isRefreshingThisCard
                          ? "Refreshing…"
                          : "Unpaid"}
                    </span>
                  </div>
                  <div className="order-card-row order-card-badges">
                    <span className="order-card-label">Order status</span>
                    <span
                      className={`order-badge order-badge--order order-badge--${order.orderStatus || "pending"}`}
                    >
                      {formatOrderStatus(order.orderStatus)}
                    </span>
                  </div>

                  {isPending && !isRefreshingThisCard && (
                    <button
                      type="button"
                      className="order-cancel-btn"
                      disabled={isCancelling}
                      onClick={() => handleCancel(id)}
                    >
                      {isCancelling ? "Cancelling…" : "Cancel order"}
                    </button>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatOrderStatus(status) {
  if (!status) return "—";
  const labels = {
    pending: "Pending",
    confirmed: "Confirmed",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

export default OrdersPage;
