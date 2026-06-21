import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import Button from "../../components/common/Button";
import ErrorMessage from "../../components/common/ErrorMessage";
import Input from "../../components/common/Input";
import { useAuthStore } from "../../store/authStore";

function Login() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await authApi.login(form);
      login({ user: result.user, token: result.token });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div>
          <h1>PM System</h1>
          <p>Preventive Maintenance System</p>
        </div>

        <ErrorMessage message={error} />

        <Input
          autoComplete="username"
          label="Username"
          name="username"
          required
          value={form.username}
          onChange={handleChange}
        />
        <Input
          autoComplete="current-password"
          label="Password"
          name="password"
          required
          type="password"
          value={form.password}
          onChange={handleChange}
        />

        <Button disabled={loading} type="submit">
          {loading ? "Signing in..." : "Login"}
        </Button>
      </form>
    </div>
  );
}

export default Login;
