import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import api from "../utils/api";

function LoginPage() {
  // Local UI state for login form inputs
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setErrorMessage("");

      // Backend auth route for login.
      // NOTE: current backend uses /users/login (not /auth/login).
      const response = await api.post("/users/login", {
        email: formData.email,
        password: formData.password,
      });

      const token = response.data?.token;
      if (!token) throw new Error("No token returned from server");

      localStorage.setItem("token", token);

      // Role-based redirect after login
      const role = response.data?.data?.user?.role;
      if (role) localStorage.setItem("role", role);

      // Staff users land on their inventory dashboard.
      if (role === "staff") {
        navigate("/staff/inventory", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (error) {
      const message =
        error.response?.data?.message || "Login failed. Please try again.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="Login to PharmaLink"
      fields={[
        {
          label: "Email",
          name: "email",
          type: "email",
          placeholder: "you@example.com",
        },
        {
          label: "Password",
          name: "password",
          type: "password",
          placeholder: "Enter your password",
        },
      ]}
      formData={formData}
      onChange={handleChange}
      onSubmit={handleSubmit}
      loading={loading}
      errorMessage={errorMessage}
      buttonText="Login"
      footerText="Don't have an account?"
      footerLinkText="Go to Signup"
      footerLinkTo="/signup"
    />
  );
}

export default LoginPage;
