import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Boxes,
  CalendarCheck2,
  ClipboardList,
  FileSpreadsheet,
  Layers3,
  LayoutDashboard,
  LogOut,
  MapPin,
  MonitorCog,
  ShieldCheck,
  Tags,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { formatDate } from "../utils/date";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", roles: ["ADMIN", "STAFF"] },
  { icon: Users, label: "Users", path: "/users", roles: ["ADMIN"] },
  { icon: MonitorCog, label: "Devices", path: "/devices", roles: ["ADMIN"] },
  { icon: Boxes, label: "Device Groups", path: "/device-groups", roles: ["ADMIN"] },
  { icon: Layers3, label: "Device Types", path: "/device-types", roles: ["ADMIN"] },
  { icon: Tags, label: "Brands", path: "/brands", roles: ["ADMIN"] },
  { icon: ClipboardList, label: "Device Models", path: "/device-models", roles: ["ADMIN"] },
  { icon: MapPin, label: "Zones", path: "/zones", roles: ["ADMIN"] },
  { icon: ShieldCheck, label: "PM Policies", path: "/pm-policies", roles: ["ADMIN"] },
  { icon: CalendarCheck2, label: "PM Plans", path: "/pm-plans", roles: ["ADMIN", "STAFF"] },
  { icon: Wrench, label: "PM Records", path: "/pm-records", roles: ["ADMIN", "STAFF"] },
  { icon: FileSpreadsheet, label: "Reports", path: "/reports", roles: ["ADMIN", "STAFF"] },
];

function MainLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const visibleMenu = menuItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">PM</div>
          <div>
            <h1>PM System</h1>
            <p>Preventive Maintenance</p>
          </div>
        </div>

        <nav className="sidebar-menu">
          {visibleMenu.map((item) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
              end
              key={item.path}
              to={item.path}
            >
              <item.icon size={18} strokeWidth={2.2} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <strong>Preventive Maintenance</strong>
            <span>{formatToday()}</span>
          </div>
          <div className="topbar-actions">
            <div className="user-pill">
              <UserRound size={17} />
              <div>
                <strong>{user?.fullName || user?.username}</strong>
                <span>{user?.role}</span>
              </div>
            </div>
            <button className="button button-secondary" onClick={handleLogout}>
              <LogOut size={17} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </div>
    </div>
  );
}

const formatToday = () => formatDate(new Date());

export default MainLayout;
