import AdminCrudPage from "../components/AdminCrudPage";

function AdminInventoriesPage() {
  return (
    <AdminCrudPage
      title="Inventories"
      endpoint="/inventories"
      fields={[
        {
          name: "pharmacy",
          label: "Pharmacy",
          // "relation" fetches /pharmacies, shows name in the dropdown,
          // but submits the _id — so the API receives a valid ObjectId.
          type: "relation",
          optionsEndpoint: "/pharmacies",
          optionLabel: "name",
          optionValue: "_id",
          required: true,
          searchable: true,
          // getValue  → human-readable name shown in the table cell
          getValue: (row) =>
            row?.pharmacy?.name || row?.pharmacy?._id || row?.pharmacy || "",
          // getEditValue → the actual ID pre-selected in the edit dropdown
          getEditValue: (row) =>
            row?.pharmacy?._id || row?.pharmacy || "",
        },
        {
          name: "medicine",
          label: "Medicine",
          type: "relation",
          optionsEndpoint: "/medicines",
          optionLabel: "name",
          optionValue: "_id",
          required: true,
          searchable: true,
          getValue: (row) =>
            row?.medicine?.name || row?.medicine?._id || row?.medicine || "",
          getEditValue: (row) =>
            row?.medicine?._id || row?.medicine || "",
        },
        {
          name: "price",
          label: "Price (RWF)",
          type: "number",
          required: true,
          searchable: false,
        },
        {
          name: "quantity",
          label: "Quantity",
          type: "number",
          required: true,
          searchable: false,
        },
        {
          name: "batchNo",
          label: "Batch No.",
          required: true,
          searchable: false,
        },
        {
          name: "isAvailable",
          label: "Available",
          type: "select",
          required: false,
          searchable: false,
          options: [
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ],
          getValue: (row) => (row?.isAvailable === false ? "false" : "true"),
          toApi: (value) => value === "true" || value === true,
        },
        {
          name: "expiryDate",
          label: "Expiry Date",
          type: "date",
          required: false,
          searchable: false,
        },
      ]}
    />
  );
}

export default AdminInventoriesPage;
