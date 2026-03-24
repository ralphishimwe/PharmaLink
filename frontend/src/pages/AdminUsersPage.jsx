import AdminCrudPage from "../components/AdminCrudPage";

function AdminUsersPage() {
  return (
    <AdminCrudPage
      title="Users"
      endpoint="/users"
      fields={[
        {
          name: "name",
          apiName: "fullname",
          label: "Full Name",
          required: true,
          searchable: true,
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          required: true,
          searchable: true,
        },
        {
          name: "phone",
          label: "Phone",
          type: "tel",   // "tel" avoids the toLocaleString() comma-formatting in the table
          required: true,
          searchable: false,
        },
        {
          name: "address",
          label: "Address",
          required: true,
          searchable: false,
        },
        {
          name: "role",
          label: "Role",
          type: "select",
          required: true,
          searchable: false,
          options: [
            { value: "user", label: "user" },
            { value: "staff", label: "staff" },
            { value: "admin", label: "admin" },
          ],
        },
        {
          name: "photo",
          label: "Photo URL",
          required: false,
          searchable: false,
          showInTable: false,
        },
        // password fields are create-only: omitIfEmpty prevents sending blank
        // values on PATCH, and showInTable: false hides them from the table.
        {
          name: "password",
          label: "Password",
          type: "password",
          required: true,
          searchable: false,
          showInTable: false,
          omitIfEmpty: true,
        },
        {
          name: "passwordConfirm",
          label: "Confirm Password",
          type: "password",
          required: true,
          searchable: false,
          showInTable: false,
          omitIfEmpty: true,
        },
      ]}
    />
  );
}

export default AdminUsersPage;
