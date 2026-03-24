import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import "../styles/adminCrud.css";

// ---------------------------------------------------------------------------
// Relation options cache
// Fetches a list endpoint once per session and reuses the result for every
// RelationSelect that points to the same endpoint (e.g. /pharmacies, /medicines).
// ---------------------------------------------------------------------------
const _relOptionsCache = new Map();

function useRelationOptions(endpoint) {
  const [options, setOptions] = useState(
    () => _relOptionsCache.get(endpoint) || [],
  );
  const [fetching, setFetching] = useState(!_relOptionsCache.has(endpoint));

  useEffect(() => {
    if (!endpoint || _relOptionsCache.has(endpoint)) return;
    let alive = true;
    api
      .get(endpoint)
      .then((res) => {
        const list = res.data?.data?.data;
        const opts = Array.isArray(list) ? list : [];
        _relOptionsCache.set(endpoint, opts);
        if (alive) setOptions(opts);
      })
      .catch(() => {
        if (alive) setOptions([]);
      })
      .finally(() => {
        if (alive) setFetching(false);
      });
    return () => {
      alive = false;
    };
  }, [endpoint]);

  return { options, fetching };
}

function AdminCrudPage({ title, endpoint, fields = [] }) {
  const tableFields = useMemo(
    () => fields.filter((f) => f.showInTable !== false),
    [fields],
  );

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [createData, setCreateData] = useState(() => buildEmptyForm(fields));
  const [createBusy, setCreateBusy] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(() => buildEmptyForm(fields));
  const [editError, setEditError] = useState(""); // inline error shown inside the edit row
  const [saveBusyId, setSaveBusyId] = useState(null);
  const [deleteBusyId, setDeleteBusyId] = useState(null);

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  async function loadRecords() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(endpoint);
      const list = res.data?.data?.data;
      setRecords(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to load records.",
      );
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  const visibleRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;

    return records.filter((row) =>
      fields.some((f) => {
        if (f.searchable === false) return false;
        const value = getFieldValue(row, f);
        return String(value ?? "")
          .toLowerCase()
          .includes(term);
      }),
    );
  }, [records, search, fields]);

  function handleCreateChange(name, value) {
    setCreateData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();

    try {
      setCreateBusy(true);
      setError("");
      await api.post(endpoint, normalizePayload(createData, fields));
      setCreateData(buildEmptyForm(fields));
      await loadRecords();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to create record.",
      );
    } finally {
      setCreateBusy(false);
    }
  }

  function startEdit(row) {
    setEditingId(String(getRowId(row)));
    setEditData(
      fields.reduce((acc, f) => {
        // getEditValue lets relation fields pre-select by ID while getValue
        // returns a human-readable name for table display.
        const val = f.getEditValue
          ? f.getEditValue(row)
          : getFieldValue(row, f);
        acc[f.name] = val ?? "";
        return acc;
      }, {}),
    );
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData(buildEmptyForm(fields));
    setEditError("");
  }

  async function saveEdit(rowId) {
    try {
      setSaveBusyId(String(rowId));
      setEditError("");
      setError("");
      await api.patch(`${endpoint}/${rowId}`, normalizePayload(editData, fields));
      cancelEdit();
      await loadRecords();
    } catch (err) {
      // Show the error inline inside the edit row so the user sees it
      // without losing their form input.
      setEditError(
        err.response?.data?.message || err.message || "Failed to update record.",
      );
    } finally {
      setSaveBusyId(null);
    }
  }

  async function deleteRow(rowId) {
    try {
      const ok = window.confirm("Delete this record?");
      if (!ok) return;
      setDeleteBusyId(String(rowId));
      setError("");
      await api.delete(`${endpoint}/${rowId}`);
      if (editingId === String(rowId)) cancelEdit();
      await loadRecords();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to delete record.",
      );
    } finally {
      setDeleteBusyId(null);
    }
  }

  return (
    <div className="admin-crud">
      <header className="admin-crud-header">
        <h2>{title}</h2>
      </header>

      <div className="admin-crud-search">
        <input
          type="text"
          placeholder={`Search ${title.toLowerCase()}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <form className="admin-crud-create" onSubmit={handleCreateSubmit}>
        <h3>Create new</h3>
        <div className="admin-crud-form-grid">
          {fields
            .filter((f) => f.creatable !== false)
            .map((f) => (
              <FieldInput
                key={`create-${f.name}`}
                field={f}
                value={createData[f.name]}
                onChange={(v) => handleCreateChange(f.name, v)}
              />
            ))}
        </div>
        <button type="submit" className="admin-crud-btn--create" disabled={createBusy}>
          {createBusy ? "Creating..." : "Create"}
        </button>
      </form>

      {loading && <p className="admin-crud-status">Loading records...</p>}
      {!loading && error && <p className="admin-crud-error">{error}</p>}

      {!loading && !error && (
        <div className="admin-crud-table-wrap">
          <table className="admin-crud-table">
            <thead>
              <tr>
                {tableFields.map((f) => (
                  <th key={`head-${f.name}`}>{f.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((row) => {
                const rowId = String(getRowId(row));
                const isEditing = editingId === rowId;
                const saveBusy = saveBusyId === rowId;
                const deleteBusy = deleteBusyId === rowId;

                return (
                  <tr key={rowId}>
                    {tableFields.map((f) => (
                      <td key={`${rowId}-${f.name}`}>
                        {isEditing && f.editable !== false ? (
                          <FieldInput
                            field={f}
                            value={editData[f.name]}
                            onChange={(v) =>
                              setEditData((prev) => ({ ...prev, [f.name]: v }))
                            }
                            compact
                          />
                        ) : f.truncateCell ? (
                          <TruncatedCell value={getFieldValue(row, f)} />
                        ) : (
                          <span>{formatCell(getFieldValue(row, f), f)}</span>
                        )}
                      </td>
                    ))}

                    <td className="admin-crud-actions">
                      {isEditing ? (
                        <>
                          {editError && (
                            <p className="admin-crud-edit-error">{editError}</p>
                          )}
                          <button
                            type="button"
                            className="admin-crud-btn--save"
                            onClick={() => saveEdit(rowId)}
                            disabled={saveBusy}
                          >
                            {saveBusy ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            className="admin-crud-btn--cancel"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="admin-crud-btn--edit"
                            onClick={() => startEdit(row)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-crud-btn--delete"
                            onClick={() => deleteRow(rowId)}
                            disabled={deleteBusy}
                          >
                            {deleteBusy ? "Deleting..." : "Delete"}
                          </button>
                        </>
                      )}
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

function FieldInput({ field, value, onChange, compact = false }) {
  const inputClass = compact
    ? "admin-crud-input admin-crud-input--compact"
    : "admin-crud-input";

  // Relation field — fetches options from an API endpoint and renders a select
  // that displays names but submits IDs.
  if (field.type === "relation") {
    return (
      <RelationSelect
        field={field}
        value={value}
        onChange={onChange}
        compact={compact}
        inputClass={inputClass}
      />
    );
  }

  if (field.type === "select") {
    return (
      <label className="admin-crud-field">
        {!compact ? <span>{field.label}</span> : null}
        <select
          className={inputClass}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        >
          <option value="">Select...</option>
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="admin-crud-field">
      {!compact ? <span>{field.label}</span> : null}
      <input
        className={inputClass}
        type={field.type || "text"}
        value={value ?? ""}
        placeholder={field.placeholder || ""}
        required={field.required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

// Renders a <select> whose options are loaded from field.optionsEndpoint.
// The option label comes from field.optionLabel (default "name") and
// the submitted value comes from field.optionValue (default "_id").
// Pass field.optionsFilter as a predicate to narrow down the fetched list
// (e.g. show only users whose role === "staff").
function RelationSelect({ field, value, onChange, compact, inputClass }) {
  const { options: rawOptions, fetching } = useRelationOptions(field.optionsEndpoint);
  const options = field.optionsFilter
    ? rawOptions.filter(field.optionsFilter)
    : rawOptions;
  const labelKey = field.optionLabel || "name";
  const valueKey = field.optionValue || "_id";

  return (
    <label className="admin-crud-field">
      {!compact ? <span>{field.label}</span> : null}
      <select
        className={inputClass}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        disabled={fetching}
      >
        <option value="">{fetching ? "Loading…" : "Select…"}</option>
        {options.map((opt) => (
          <option key={opt[valueKey]} value={opt[valueKey]}>
            {opt[labelKey]}
          </option>
        ))}
      </select>
    </label>
  );
}

// Renders a truncated cell value. Values longer than 40 characters are cut off
// with "…". The full value appears as a tooltip on hover, and clicking the cell
// copies it to the clipboard and shows it in an alert so the user can see/use it.
function TruncatedCell({ value }) {
  if (value == null || value === "") return <span>—</span>;
  const str = String(value);
  if (str.length <= 40) return <span>{str}</span>;
  const handleClick = () => {
    navigator.clipboard?.writeText(str).catch(() => {});
    window.alert(str);
  };
  return (
    <span
      className="admin-crud-truncated"
      title={str}
      onClick={handleClick}
    >
      {str.slice(0, 40)}…
    </span>
  );
}

function buildEmptyForm(fields) {
  return fields.reduce((acc, f) => {
    acc[f.name] = "";
    return acc;
  }, {});
}

function normalizePayload(data, fields) {
  return fields.reduce((acc, f) => {
    let value = data[f.name];
    if (typeof f.toApi === "function") {
      value = f.toApi(value, data);
    }
    if (f.type === "number" && value !== "") {
      value = Number(value);
    }
    // Fields marked omitIfEmpty (e.g. password) are excluded from the payload
    // when their value is empty — prevents accidental blank-password PATCHes.
    if (f.omitIfEmpty && (value === "" || value == null)) {
      return acc;
    }
    const payloadKey = f.apiName || f.name;
    acc[payloadKey] = value;
    return acc;
  }, {});
}

function formatCell(value, field) {
  if (value == null || value === "") return "—";
  if (field.type === "number") return Number(value).toLocaleString();
  return String(value);
}

function getRowId(row) {
  return row?._id || row?.id;
}

function getFieldValue(row, field) {
  if (typeof field.getValue === "function") return field.getValue(row);
  const key = field.apiName || field.name;
  return row?.[key];
}

export default AdminCrudPage;

