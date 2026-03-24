import AdminCrudPage from "../components/AdminCrudPage";

function AdminPharmaciesPage() {
  return (
    <AdminCrudPage
      title="Pharmacies"
      endpoint="/pharmacies"
      fields={[
        // Read-only pharmacy ID — shown in table so admin can copy it when
        // needed (e.g. when creating inventory entries).
        {
          name: "_id",
          label: "Pharmacy ID",
          creatable: false,
          editable: false,
          searchable: false,
          getValue: (row) => row?._id || "",
        },
        {
          name: "name",
          label: "Name",
          required: true,
          searchable: true,
        },
        {
          name: "address",
          label: "Address",
          required: true,
          searchable: false,
        },
        {
          name: "phone",
          label: "Phone",
          type: "tel",
          required: true,
          searchable: false,
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          required: true,
          searchable: false,
          // email is now visible in the table
        },
        {
          name: "openingHours",
          label: "Opening Hours",
          required: true,
          searchable: false,
        },
        {
          // "relation" fetches /users, but only shows users whose role is "staff"
          // so the admin picks a staff member by name, not by raw ID.
          name: "staff",
          label: "Staff",
          type: "relation",
          optionsEndpoint: "/users",
          optionLabel: "fullname",
          optionValue: "_id",
          optionsFilter: (user) => user.role === "staff",
          required: true,
          searchable: false,
          getValue: (row) =>
            row?.staff?.fullname ||
            row?.staff?.name ||
            row?.staff?._id ||
            row?.staff ||
            "",
          getEditValue: (row) => row?.staff?._id || row?.staff || "",
        },
      ]}
    />
  );
}

export default AdminPharmaciesPage;
