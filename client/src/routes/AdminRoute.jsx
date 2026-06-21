import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

function AdminRoute() {
  const user = useAuthStore((state) => state.user);

  if (user?.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default AdminRoute;
