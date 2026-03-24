import AdminCrudPage from "../components/AdminCrudPage";

function AdminMedicinesPage() {
  return (
    <AdminCrudPage
      title="Medicines"
      endpoint="/medicines"
      fields={[
        {
          name: "name",
          label: "Name",
          required: true,
          searchable: true,
        },
        {
          name: "dosageForm",
          label: "Dosage Form",
          type: "select",
          required: true,
          searchable: false,
          options: [
            { value: "tablet", label: "Tablet" },
            { value: "injection", label: "Injection" },
            { value: "syrup", label: "Syrup" },
          ],
        },
        {
          name: "manufacturer",
          label: "Manufacturer",
          required: true,
          searchable: true,
        },
        {
          name: "description",
          apiName: "details",
          label: "Details",
          required: true,
          searchable: false,
        },
        {
          name: "image",
          apiName: "images",
          label: "Image URL",
          required: false,
          searchable: false,
          // Now shown in the table; long URLs are truncated (click to copy/view full URL).
          truncateCell: true,
          getValue: (row) =>
            Array.isArray(row?.images) && row.images.length > 0
              ? row.images[0]
              : "",
          toApi: (value) => {
            const v = String(value || "").trim();
            return v ? [v] : [];
          },
        },
      ]}
    />
  );
}

export default AdminMedicinesPage;
