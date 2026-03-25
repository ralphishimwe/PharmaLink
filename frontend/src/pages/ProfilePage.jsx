import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import "../styles/profile.css";

/**
 * User profile page:
 * - Fetch current user data (GET /users/me)
 * - Update profile (PATCH /users/updateMe)
 * - Update password (PATCH /users/updateMyPassword)
 *
 * Backend expects:
 * - updateMyPassword:
 *   { passwordCurrent, password, passwordConfirm }
 * Frontend UI uses:
 *   currentPassword, newPassword, confirmPassword
 */
function ProfilePage() {
  const navigate = useNavigate();

  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [currentUser, setCurrentUser] = useState(null);

  // Profile update form inputs (we use placeholders as requested)
  const [profileForm, setProfileForm] = useState({
    fullname: "",
    address: "",
    email: "",
    phone: "",
  });

  // Password update form inputs
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    // Protect route on the client: if token is missing, redirect to login.
    if (!localStorage.getItem("token")) {
      navigate("/login", { state: { from: "/profile" } });
      return;
    }

    async function loadMe() {
      try {
        setLoadingUser(true);
        setUserError("");

        const res = await api.get("/users/me");
        // GET /users/me uses handlerFactory.getOne => response is:
        // { status: 'success', data: { data: <userDoc> } }
        const user = res.data?.data?.data;
        if (!user) throw new Error("No user returned from server");
        setCurrentUser(user);
      } catch (err) {
        setUserError(
          err.response?.data?.message || err.message || "Failed to load profile",
        );
        setCurrentUser(null);
      } finally {
        setLoadingUser(false);
      }
    }

    loadMe();
  }, [navigate]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!currentUser) return;

    setSuccessMessage("");
    setErrorMessage("");

    // Only include fields the user actually filled in — empty fields are left unchanged.
    const payload = {};
    const fn = profileForm.fullname.trim();
    const em = profileForm.email.trim();
    const ph = profileForm.phone.trim();
    const ad = profileForm.address.trim();

    if (fn) payload.fullname = fn;
    if (em) payload.email = em;
    if (ph) payload.phone = ph;
    if (ad) payload.address = ad;

    if (Object.keys(payload).length === 0) {
      setErrorMessage("Please fill in at least one field to update.");
      return;
    }

    // Validate only the fields that were provided.
    if (payload.fullname !== undefined && payload.fullname.length < 5) {
      setErrorMessage("Fullname must be at least 5 characters.");
      return;
    }
    if (payload.email !== undefined && !/^\S+@\S+\.\S+$/.test(payload.email)) {
      setErrorMessage("Please provide a valid email.");
      return;
    }
    if (payload.phone !== undefined && !/^\d{10}$/.test(payload.phone)) {
      setErrorMessage("Phone number must be exactly 10 digits.");
      return;
    }

    try {
      await api.patch("/users/updateMe", payload);
      setSuccessMessage("Profile updated successfully.");
      // Refresh user data so placeholders show new values.
      const res = await api.get("/users/me");
      setCurrentUser(res.data?.data?.data || null);
      setProfileForm({ fullname: "", address: "", email: "", phone: "" });
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || "Profile update failed.",
      );
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    setPasswordSuccess("");
    setPasswordError("");

    const currentPassword = passwordForm.currentPassword;
    const newPassword = passwordForm.newPassword;
    const confirmPassword = passwordForm.confirmPassword;

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (newPassword.length < 8 || confirmPassword.length < 8) {
      setPasswordError("New password and confirm password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    try {
      // Backend expects: passwordCurrent, password, passwordConfirm
      const payload = {
        passwordCurrent: currentPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      };

      const res = await api.patch("/users/updateMyPassword", payload);
      const token = res.data?.token;
      if (token) localStorage.setItem("token", token);

      setPasswordSuccess("Password updated successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || err.message || "Password update failed.",
      );
    }
  };

  if (loadingUser) {
    return (
      <div className="profile-page">
        <p className="profile-status">Loading profile…</p>
      </div>
    );
  }

  // Final guard to ensure the profile UI isn't shown if the token disappeared.
  if (!localStorage.getItem("token")) return null;

  return (
    <div className="profile-page">
      <h1>My Profile</h1>

      {currentUser && (
        <div className="profile-summary">
          <p>
            <strong>Name:</strong> {currentUser.fullname}
          </p>
          <p>
            <strong>Email:</strong> {currentUser.email}
          </p>
        </div>
      )}

      {userError && (
        <p className="profile-error" role="alert">
          {userError}
        </p>
      )}

      {successMessage && (
        <p className="profile-success" role="status">
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <p className="profile-error" role="alert">
          {errorMessage}
        </p>
      )}

      <section className="profile-section">
        <h2>Profile Info</h2>

        <form className="profile-form" onSubmit={handleUpdateProfile}>
          <div className="profile-field">
            <label htmlFor="fullname">Fullname</label>
            <input
              id="fullname"
              name="fullname"
              type="text"
              placeholder={currentUser?.fullname || "Fullname"}
              value={profileForm.fullname}
              onChange={handleProfileChange}
              autoComplete="name"
            />
          </div>

          <div className="profile-field">
            <label htmlFor="address">Address</label>
            <input
              id="address"
              name="address"
              type="text"
              placeholder={currentUser?.address || "Address"}
              value={profileForm.address}
              onChange={handleProfileChange}
              autoComplete="street-address"
            />
          </div>

          <div className="profile-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder={currentUser?.email || "Email"}
              value={profileForm.email}
              onChange={handleProfileChange}
              autoComplete="email"
            />
          </div>

          <div className="profile-field">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder={currentUser?.phone ? String(currentUser.phone) : "10-digit phone"}
              value={profileForm.phone}
              onChange={handleProfileChange}
            />
          </div>

          <button type="submit" disabled={!currentUser}>
            Save Profile
          </button>
        </form>
      </section>

      <section className="profile-section">
        <h2>Change Password</h2>

        {passwordSuccess && (
          <p className="profile-success" role="status">
            {passwordSuccess}
          </p>
        )}

        {passwordError && (
          <p className="profile-error" role="alert">
            {passwordError}
          </p>
        )}

        <form className="profile-form" onSubmit={handleUpdatePassword}>
          <div className="profile-field">
            <label htmlFor="currentPassword">Current password</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              placeholder="Enter current password"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="profile-field">
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="profile-field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <button type="submit">Update Password</button>
        </form>
      </section>
    </div>
  );
}

export default ProfilePage;

