import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import "../styles/staffPayments.css";

/**
 * Staff payments view:
 * GET /api/v1/payments/pharmacy → { data: { data: Payment[] } }
 *
 * View-only (no editing yet).
 */
function StaffPaymentsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const loadPayments = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { state: { from: "/staff/payments" } });
        return;
      }

      try {
        setLoading(true);
        setError("");

        const headers = { Authorization: `Bearer ${token}` };
        const res = await api.get("/payments/pharmacy", { headers });

        const list = res.data?.data?.data;
        setPayments(Array.isArray(list) ? list : []);
      } catch (err) {
        if (err.response?.status === 401) {
          navigate("/login", { state: { from: "/staff/payments" } });
          return;
        }

        if (err.response?.status === 403) {
          setError("You are not authorized to view staff payments.");
          setPayments([]);
          return;
        }

        setError(
          err.response?.data?.message || err.message || "Could not load payments.",
        );
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, [navigate]);

  return (
    <div className="staff-payments-page">
      {loading && (
        <p className="staff-payments-status" role="status">
          Loading payments…
        </p>
      )}

      {!loading && error && (
        <p className="staff-payments-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && payments.length === 0 && (
        <p className="staff-payments-status">No payments found.</p>
      )}

      {!loading && !error && payments.length > 0 && (
        <div className="staff-payments-table-wrap">
          <table className="staff-payments-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Order ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const paymentId = p._id;
                const orderId = p.order;
                const amountText = p.amount
                  ? `${Number(p.amount).toLocaleString()} RWF`
                  : "—";
                const statusText = p.status || "—";
                const transactionIdText = p.transactionID || "—";

                return (
                  <tr key={paymentId}>
                    <td>
                      <code className="staff-payments-code">
                        {paymentId}
                      </code>
                    </td>
                    <td>
                      <code className="staff-payments-code">{orderId}</code>
                    </td>
                    <td>{amountText}</td>
                    <td>{statusText}</td>
                    <td>{transactionIdText}</td>
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

export default StaffPaymentsPage;

