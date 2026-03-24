import { useEffect, useState } from "react";
import api from "../utils/api";
import "../styles/adminCrud.css";

function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/orders");
      const list = res.data?.data?.data;
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to load orders.",
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleStatusChange(orderId, nextStatus) {
    try {
      setUpdatingId(String(orderId));
      setError("");
      await api.patch(`/orders/${orderId}`, { orderStatus: nextStatus });
      await loadOrders();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to update order status.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(orderId) {
    const ok = window.confirm("Delete this order?");
    if (!ok) return;
    try {
      setDeletingId(String(orderId));
      setError("");
      await api.delete(`/orders/${orderId}`);
      await loadOrders();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete order.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-crud">
      <header className="admin-crud-header">
        <h2>Orders</h2>
      </header>

      {loading && <p className="admin-crud-status">Loading orders...</p>}
      {!loading && error && <p className="admin-crud-error">{error}</p>}

      {!loading && !error && (
        <div className="admin-crud-table-wrap">
          <table className="admin-crud-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>User</th>
                <th>Pharmacy</th>
                <th>Total Amount</th>
                <th>Payment Status</th>
                <th>Delivery Address</th>
                <th>Order Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const id = order?._id;
                const userLabel = formatRef(order?.user);
                const pharmacyLabel = formatRef(order?.pharmacy);
                const amount = Number(order?.totalAmount || 0).toLocaleString();
                const status = order?.orderStatus || "pending";
                const paymentStatus = order?.paymentStatus || "unpaid";
                const deliveryAddress = order?.deliveryAddress || "—";
                const isUpdating = updatingId === String(id);
                const isDeleting = deletingId === String(id);

                return (
                  <tr key={id}>
                    <td>{id || "—"}</td>
                    <td>{userLabel}</td>
                    <td>{pharmacyLabel}</td>
                    <td>{amount} RWF</td>
                    <td>{paymentStatus}</td>
                    <td>{deliveryAddress}</td>
                    <td>
                      <select
                        className="admin-crud-input admin-crud-input--compact"
                        value={status}
                        disabled={isUpdating}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (next !== status) {
                            handleStatusChange(id, next);
                          }
                        }}
                      >
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="delivered">delivered</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </td>
                    <td className="admin-crud-actions">
                      <button
                        type="button"
                        className="admin-crud-btn--delete"
                        onClick={() => handleDelete(id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatRef(value) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return value.name || value.fullname || value._id || "—";
}

export default AdminOrdersPage;
