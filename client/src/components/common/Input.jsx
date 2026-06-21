function Input({ label, error, ...props }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <input {...props} />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export default Input;
