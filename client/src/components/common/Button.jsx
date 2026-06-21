function Button({
  children,
  className = "",
  type = "button",
  variant = "primary",
  ...props
}) {
  return (
    <button className={`button button-${variant} ${className}`} type={type} {...props}>
      {children}
    </button>
  );
}

export default Button;
