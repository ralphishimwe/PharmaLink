import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

function SignupPage() {
  // Local UI state for signup form inputs
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    passwordConfirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  // setRole updates AuthContext state so App.jsx and Navbar re-render
  // immediately with the correct role after signup — no reload needed.
  const { setRole } = useAuth();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Simple client-side checks before sending to backend
    if (formData.password.length < 8 || formData.passwordConfirm.length < 8) {
      setErrorMessage("Password and Confirm Password must be at least 8 characters.");
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setErrorMessage("Password and Confirm Password do not match.");
      return;
    }

    if (!/^\d{10}$/.test(formData.phone)) {
      setErrorMessage("Phone number must be exactly 10 digits.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      // Backend auth route for signup.
      // NOTE: current backend uses /users/signup (not /auth/signup).
      const response = await api.post("/users/signup", {
        fullname: formData.fullname,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        password: formData.password,
        passwordConfirm: formData.passwordConfirm,
      });

      const token = response.data?.token;
      if (!token) throw new Error("No token returned from server");

      localStorage.setItem("token", token);

      // Fetch the authoritative role from the server, then push it into
      // AuthContext via setRole(). This simultaneously updates localStorage
      // AND triggers a React re-render, so route guards evaluate instantly.
      let role = null;
      try {
        const meRes = await api.get("/users/me");
        role = meRes.data?.data?.data?.role || null;
      } catch (e) {
        role = null;
      }

      setRole(role); // ← updates context state + localStorage in one call

      // Staff users land on their inventory dashboard.
      if (role === "staff") {
        navigate("/staff/inventory", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (error) {
      const message =
        error.response?.data?.message || "Signup failed. Please try again.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="Create an Account"
      fields={[
        {
          label: "Fullname",
          name: "fullname",
          type: "text",
          placeholder: "Your full name",
        },
        {
          label: "Email",
          name: "email",
          type: "email",
          placeholder: "you@example.com",
        },
        {
          label: "Phone",
          name: "phone",
          type: "tel",
          placeholder: "07XXXXXXXX",
          minLength: 10,
          maxLength: 10,
          pattern: "\\d{10}",
          inputMode: "numeric",
          title: "Phone number must be exactly 10 digits",
        },
        {
          label: "Address",
          name: "address",
          type: "text",
          placeholder: "Kigali, Rwanda",
        },
        {
          label: "Password",
          name: "password",
          type: "password",
          placeholder: "Create a password",
          minLength: 8,
          title: "Password must be at least 8 characters",
        },
        {
          label: "Confirm Password",
          name: "passwordConfirm",
          type: "password",
          placeholder: "Re-enter your password",
          minLength: 8,
          title: "Confirm Password must be at least 8 characters",
        },
      ]}
      formData={formData}
      onChange={handleChange}
      onSubmit={handleSubmit}
      loading={loading}
      errorMessage={errorMessage}
      buttonText="Signup"
      footerText="Already have an account?"
      footerLinkText="Go to Login"
      footerLinkTo="/login"
    />
  );
}

export default SignupPage;
