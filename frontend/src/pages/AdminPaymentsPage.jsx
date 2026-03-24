import AdminCrudPage from "../components/AdminCrudPage";

function AdminPaymentsPage() {
  return (
    <AdminCrudPage
      title="Payments"
      endpoint="/payments"
      fields={[
        {
          name: "order",
          label: "Order ID",
          required: true,
          searchable: true,
          getValue: (row) => row?.order?._id || row?.order || "",
        },
        {
          name: "amount",
          label: "Amount (RWF)",
          type: "number",
          required: true,
          searchable: false,
        },
        {
          name: "provider",
          label: "Provider",
          type: "select",
          required: true,
          searchable: false,
          options: [{ value: "stripe", label: "Stripe" }],
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          searchable: false,
          options: [
            { value: "pending", label: "Pending" },
            { value: "successful", label: "Successful" },
            { value: "failed", label: "Failed" },
          ],
        },
        {
          // Long transaction IDs are truncated; click to see the full value.
          name: "transactionID",
          label: "Transaction ID",
          required: false,
          searchable: false,
          truncateCell: true,
        },
        {
          // Provider references can be long — show truncated, click to expand.
          name: "providerReference",
          label: "Provider Ref.",
          required: false,
          searchable: false,
          truncateCell: true,
        },
        {
          name: "paidAt",
          label: "Paid At",
          type: "date",
          required: false,
          searchable: false,
          getValue: (row) =>
            row?.paidAt ? String(row.paidAt).slice(0, 10) : "",
        },
        {
          // Payment URL is now visible in the table; long URLs are truncated.
          // Clicking the cell opens an alert with the full URL (and copies it).
          name: "paymentUrl",
          label: "Payment URL",
          required: false,
          searchable: false,
          truncateCell: true,
        },
      ]}
    />
  );
}

export default AdminPaymentsPage;
