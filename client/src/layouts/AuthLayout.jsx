import { Outlet } from "react-router-dom";

function AuthLayout() {
  return (
    <main className="auth-layout">
      <Outlet />
    </main>
  );
}

export default AuthLayout;
