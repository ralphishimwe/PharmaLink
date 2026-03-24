import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import "../styles/orders.css";

const STATUS_OPTIONS = ["pending", "confirmed", "delivered"];

function StaffOrdersPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const loadOrders = useCallback(
    async ({ silent = false } = {}) => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { state: { from: "/staff/orders" } });
        return [];
      }

      try {
        if (!silent) setLoading(true);
        setError("");

        const headers = { Authorization: `Bearer ${token}` };
        const res = await api.get("/orders/pharmacy-orders", { headers });
        const list = res.data?.data?.data;
        setOrders(Array.isArray(list) ? list : []);
        return Array.isArray(list) ? list : [];
      } catch (err) {
        if (err.response?.status === 401) {
          navigate("/login", { state: { from: "/staff/orders" } });
          return [];
        }

        if (err.response?.status === 403) {
          setError("You are not authorized to view these pharmacy orders.");
          setOrders([]);
          return [];
        }

        setError(
          err.response?.data?.message ||
            err.message ||
            "Could not load pharmacy orders.",
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

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdatingOrderId(orderId);
      setError("");
      await api.patch(`/orders/${orderId}`, { orderStatus: newStatus });
      await loadOrders({ silent: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to update order status.",
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="orders-page">
      {loading && (
        <p className="orders-status" role="status">
          Loading pharmacy orders…
        </p>
      )}

      {!loading && error && (
        <p className="orders-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && orders.length === 0 && (
        <p className="orders-status">No orders found for your pharmacy yet.</p>
      )}

      {!loading && orders.length > 0 && (
        <ul className="orders-grid">
          {orders.map((order) => {
            const id = order._id;
            const paymentStatus = order.paymentStatus || "unpaid";
            const orderStatus = order.orderStatus || "pending";
            const locked =
              orderStatus === "delivered" || orderStatus === "cancelled";

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
                      className={`order-badge order-badge--payment order-badge--${paymentStatus}`}
                    >
                      {paymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </span>
                  </div>

                  <div className="order-card-row order-card-badges">
                    <span className="order-card-label">Order status</span>
                    <span
                      className={`order-badge order-badge--order order-badge--${orderStatus}`}
                    >
                      {formatOrderStatus(orderStatus)}
                    </span>
                  </div>

                  <div className="order-card-row order-card-status-update">
                    <label className="order-card-label" htmlFor={`status-${id}`}>
                      Update order status
                    </label>
                    <select
                      id={`status-${id}`}
                      className="order-status-select"
                      value={orderStatus}
                      disabled={locked || updatingOrderId === id}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next && next !== orderStatus) {
                          handleUpdateOrderStatus(id, next);
                        }
                      }}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      {orderStatus === "cancelled" ? (
                        <option value="cancelled">cancelled</option>
                      ) : null}
                    </select>
                  </div>
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

export default StaffOrdersPage;

