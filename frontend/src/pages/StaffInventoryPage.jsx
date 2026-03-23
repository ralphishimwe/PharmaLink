import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import "../styles/staffInventory.css";

/**
 * Staff inventory management (view + create + inline update + delete).
 *
 * Uses:
 * - GET /api/v1/inventories/my
 * - GET /api/v1/medicines
 * - POST /api/v1/inventories
 * - PATCH /api/v1/inventories/:id
 * - DELETE /api/v1/inventories/:id
 */
function StaffInventoryPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  const [medicineOptions, setMedicineOptions] = useState([]);
  const [medicinesLoading, setMedicinesLoading] = useState(false);

  const [createError, setCreateError] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  const [formData, setFormData] = useState({
    medicine: "", // medicineId
    price: "",
    quantity: "",
    batchNo: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    medicine: "",
    price: "",
    quantity: "",
    batchNo: "",
  });
  const [saveBusyId, setSaveBusyId] = useState(null);
  const [deleteBusyId, setDeleteBusyId] = useState(null);

  const token = useMemo(() => localStorage.getItem("token"), []);

  const loadMedicines = useCallback(async () => {
    try {
      setMedicinesLoading(true);
      setCreateError("");

      const res = await api.get("/medicines");
      const list = res.data?.data?.data;
      setMedicineOptions(Array.isArray(list) ? list : []);
    } catch (err) {
      setCreateError(
        err.response?.data?.message ||
          err.message ||
          "Could not load medicines for selection.",
      );
      setMedicineOptions([]);
    } finally {
      setMedicinesLoading(false);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    if (!token) {
      navigate("/login", { state: { from: "/staff/inventory" } });
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Staff wrapper: pharmacy is derived from Pharmacy.staff (backend).
      const res = await api.get("/inventories/my");
      const list = res.data?.data?.data;
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login", { state: { from: "/staff/inventory" } });
        return;
      }

      if (err.response?.status === 403) {
        setError("You are not authorized to view this staff inventory.");
        setItems([]);
        return;
      }

      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not load inventory.",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [navigate, token]);

  useEffect(() => {
    loadMedicines();
    loadInventory();
  }, [loadMedicines, loadInventory]);

  const beginEdit = (inv) => {
    const medicineId = inv.medicine?._id ? String(inv.medicine._id) : String(inv.medicine);
    setEditingId(String(inv._id));
    setEditDraft({
      medicine: medicineId,
      price: String(inv.price ?? ""),
      quantity: String(inv.quantity ?? ""),
      batchNo: String(inv.batchNo ?? ""),
    });
    setCreateError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({ medicine: "", price: "", quantity: "", batchNo: "" });
  };

  const validatePayload = ({ medicine, price, quantity, batchNo }) => {
    if (!medicine) return "Medicine is required.";
    const p = Number(price);
    const q = Number(quantity);
    if (!Number.isFinite(p) || p <= 0) return "Price must be greater than 0.";
    if (!Number.isFinite(q) || q <= 0) return "Quantity must be greater than 0.";
    if (!batchNo || !String(batchNo).trim()) return "Batch number is required.";
    return "";
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!token) return;

    const payloadError = validatePayload(formData);
    if (payloadError) {
      setCreateError(payloadError);
      return;
    }

    try {
      setCreateBusy(true);
      setCreateError("");

      await api.post("/inventories", {
        medicine: formData.medicine,
        price: Number(formData.price),
        quantity: Number(formData.quantity),
        batchNo: String(formData.batchNo).trim(),
      });

      setFormData({ medicine: "", price: "", quantity: "", batchNo: "" });
      await loadInventory();
    } catch (err) {
      setCreateError(
        err.response?.data?.message ||
          err.message ||
          "Could not create inventory item.",
      );
    } finally {
      setCreateBusy(false);
    }
  };

  const handleSaveEdit = async (invId) => {
    if (!token) return;
    const payloadError = validatePayload(editDraft);
    if (payloadError) {
      setCreateError(payloadError);
      return;
    }

    try {
      setSaveBusyId(invId);
      setCreateError("");

      await api.patch(`/inventories/${invId}`, {
        medicine: editDraft.medicine,
        price: Number(editDraft.price),
        quantity: Number(editDraft.quantity),
        batchNo: String(editDraft.batchNo).trim(),
      });

      cancelEdit();
      await loadInventory();
    } catch (err) {
      setCreateError(
        err.response?.data?.message ||
          err.message ||
          "Could not update this inventory item.",
      );
    } finally {
      setSaveBusyId(null);
    }
  };

  const handleDelete = async (invId) => {
    if (!token) return;
    try {
      const ok = window.confirm("Delete this inventory item?");
      if (!ok) return;

      setDeleteBusyId(invId);
      setCreateError("");

      await api.delete(`/inventories/${invId}`);
      if (editingId === String(invId)) cancelEdit();
      await loadInventory();
    } catch (err) {
      setCreateError(
        err.response?.data?.message ||
          err.message ||
          "Could not delete this inventory item.",
      );
    } finally {
      setDeleteBusyId(null);
    }
  };

  return (
    <div className="staff-inventory-page">
      <header className="staff-inventory-header">
        <h2 className="staff-inventory-title">Manage Inventory</h2>
        <p className="staff-inventory-subtitle">
          Edit price, quantity, and batch number. No expiry date is shown.
        </p>
      </header>

      {createError && (
        <p className="staff-inventory-error" role="alert">
          {createError}
        </p>
      )}

      {/* Create form */}
      <form className="staff-inventory-form" onSubmit={handleCreate}>
        <div className="staff-inventory-form-grid">
          <div className="staff-inventory-field">
            <label htmlFor="inv-medicine">Medicine</label>
            <select
              id="inv-medicine"
              value={formData.medicine}
              onChange={(e) =>
                setFormData((p) => ({ ...p, medicine: e.target.value }))
              }
              disabled={medicinesLoading || createBusy}
            >
              <option value="">{medicinesLoading ? "Loading…" : "Select medicine"}</option>
              {medicineOptions.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="staff-inventory-field">
            <label htmlFor="inv-price">Price (RWF)</label>
            <input
              id="inv-price"
              type="number"
              min="1"
              step="1"
              value={formData.price}
              onChange={(e) =>
                setFormData((p) => ({ ...p, price: e.target.value }))
              }
              disabled={createBusy}
              placeholder="e.g. 2000"
            />
          </div>

          <div className="staff-inventory-field">
            <label htmlFor="inv-quantity">Quantity</label>
            <input
              id="inv-quantity"
              type="number"
              min="1"
              step="1"
              value={formData.quantity}
              onChange={(e) =>
                setFormData((p) => ({ ...p, quantity: e.target.value }))
              }
              disabled={createBusy}
              placeholder="e.g. 10"
            />
          </div>

          <div className="staff-inventory-field">
            <label htmlFor="inv-batchNo">Batch No</label>
            <input
              id="inv-batchNo"
              type="text"
              value={formData.batchNo}
              onChange={(e) =>
                setFormData((p) => ({ ...p, batchNo: e.target.value }))
              }
              disabled={createBusy}
              placeholder="e.g. BATCH-001"
            />
          </div>
        </div>

        <div className="staff-inventory-form-actions">
          <button className="staff-inventory-btn" type="submit" disabled={createBusy}>
            {createBusy ? "Creating…" : "Create inventory"}
          </button>
        </div>
      </form>

      {loading && (
        <p className="staff-inventory-status" role="status">
          Loading inventory…
        </p>
      )}

      {!loading && error && (
        <p className="staff-inventory-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="staff-inventory-status">No inventory items found.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="staff-inventory-grid">
          {items.map((inv) => {
            const id = String(inv._id);
            const medicineName = inv.medicine?.name || "—";
            const priceText = inv.price !== undefined && inv.price !== null ? Number(inv.price).toLocaleString() : "0";
            const quantity = inv.quantity !== undefined && inv.quantity !== null ? Number(inv.quantity) : 0;
            const inStock = quantity > 0;
            const batchNoText = inv.batchNo || "—";

            const isEditing = editingId === id;
            const busySaving = saveBusyId === id;
            const busyDeleting = deleteBusyId === id;

            return (
              <li key={id}>
                <article className="staff-inventory-card">
                  {!isEditing ? (
                    <>
                      <h3 className="staff-inventory-name">{medicineName}</h3>
                      <p className="staff-inventory-price">{priceText} RWF</p>
                      <p
                        className={`staff-inventory-stock ${
                          inStock
                            ? "staff-inventory-stock--yes"
                            : "staff-inventory-stock--no"
                        }`}
                      >
                        {inStock ? "In Stock" : "Out of stock"}
                      </p>
                      <p className="staff-inventory-meta">
                        Quantity: {quantity}
                      </p>
                      <p className="staff-inventory-meta">
                        Batch No: {batchNoText}
                      </p>

                      <div className="staff-inventory-card-actions">
                        <button
                          type="button"
                          className="staff-inventory-btn staff-inventory-btn--secondary"
                          onClick={() => beginEdit(inv)}
                          disabled={busyDeleting}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="staff-inventory-btn staff-inventory-btn--danger"
                          onClick={() => handleDelete(id)}
                          disabled={busySaving}
                        >
                          {busyDeleting ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="staff-inventory-edit-grid">
                        <div className="staff-inventory-field">
                          <label htmlFor={`edit-medicine-${id}`}>Medicine</label>
                          <select
                            id={`edit-medicine-${id}`}
                            value={editDraft.medicine}
                            onChange={(e) =>
                              setEditDraft((p) => ({
                                ...p,
                                medicine: e.target.value,
                              }))
                            }
                            disabled={busySaving}
                          >
                            {medicineOptions.map((m) => (
                              <option key={m._id} value={m._id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="staff-inventory-field">
                          <label htmlFor={`edit-price-${id}`}>Price</label>
                          <input
                            id={`edit-price-${id}`}
                            type="number"
                            min="1"
                            step="1"
                            value={editDraft.price}
                            onChange={(e) =>
                              setEditDraft((p) => ({
                                ...p,
                                price: e.target.value,
                              }))
                            }
                            disabled={busySaving}
                          />
                        </div>

                        <div className="staff-inventory-field">
                          <label htmlFor={`edit-quantity-${id}`}>Quantity</label>
                          <input
                            id={`edit-quantity-${id}`}
                            type="number"
                            min="1"
                            step="1"
                            value={editDraft.quantity}
                            onChange={(e) =>
                              setEditDraft((p) => ({
                                ...p,
                                quantity: e.target.value,
                              }))
                            }
                            disabled={busySaving}
                          />
                        </div>

                        <div className="staff-inventory-field">
                          <label htmlFor={`edit-batch-${id}`}>Batch No</label>
                          <input
                            id={`edit-batch-${id}`}
                            type="text"
                            value={editDraft.batchNo}
                            onChange={(e) =>
                              setEditDraft((p) => ({
                                ...p,
                                batchNo: e.target.value,
                              }))
                            }
                            disabled={busySaving}
                          />
                        </div>
                      </div>

                      <div className="staff-inventory-edit-actions">
                        <button
                          type="button"
                          className="staff-inventory-btn"
                          onClick={() => handleSaveEdit(id)}
                          disabled={busySaving}
                        >
                          {busySaving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="staff-inventory-btn staff-inventory-btn--secondary"
                          onClick={cancelEdit}
                          disabled={busySaving}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
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

export default StaffInventoryPage;

