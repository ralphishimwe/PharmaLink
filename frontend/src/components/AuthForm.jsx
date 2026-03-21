import { Link } from "react-router-dom";

function AuthForm({
  title,
  fields,
  formData,
  onChange,
  onSubmit,
  buttonText,
  loading = false,
  errorMessage = "",
  footerText,
  footerLinkText,
  footerLinkTo,
}) {
  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>{title}</h1>

        {fields.map((field) => (
          <div key={field.name} className="input-group">
            <label htmlFor={field.name}>{field.label}</label>
            <input
              id={field.name}
              type={field.type}
              name={field.name}
              placeholder={field.placeholder}
              value={formData[field.name]}
              onChange={onChange}
              minLength={field.minLength}
              maxLength={field.maxLength}
              pattern={field.pattern}
              inputMode={field.inputMode}
              title={field.title}
              required
            />
          </div>
        ))}

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : buttonText}
        </button>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <p className="auth-footer">
          {footerText} <Link to={footerLinkTo}>{footerLinkText}</Link>
        </p>
      </form>
    </div>
  );
}

export default AuthForm;
