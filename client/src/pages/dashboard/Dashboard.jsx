import { useEffect, useState } from "react";
import { dashboardApi } from "../../api/dashboardApi";
import ErrorMessage from "../../components/common/ErrorMessage";
import Loading from "../../components/common/Loading";
import { useAuthStore } from "../../store/authStore";

function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const [summary, setSummary] = useState({
    users: "-",
    devices: "-",
    pmPlans: "-",
    pmRecords: "-",
    dueToday: "-",
    upcoming: "-",
    overdue: "-",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await dashboardApi.getSummary();
        const counts = data.counts || {};
        const alerts = data.alerts || {};

        setSummary({
          users: user?.role === "ADMIN" ? counts.users ?? 0 : "-",
          devices: counts.devices ?? 0,
          pmPlans: counts.pmPlans ?? 0,
          pmRecords: counts.pmRecords ?? 0,
          dueToday: alerts.dueToday ?? 0,
          upcoming: alerts.upcoming ?? 0,
          overdue: alerts.overdue ?? 0,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [user?.role]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>System overview</p>
        </div>
      </div>

      <ErrorMessage message={error} />
      {loading ? (
        <Loading />
      ) : (
        <div className="summary-grid">
          <SummaryCard className="summary-card-amber" label="Due Today" value={summary.dueToday} />
          <SummaryCard className="summary-card-red" label="Overdue" value={summary.overdue} />
          <SummaryCard
            className="summary-card-green"
            label="Upcoming 7 days"
            value={summary.upcoming}
          />
          <SummaryCard label="PM Records" value={summary.pmRecords} />
          {user?.role === "ADMIN" && <SummaryCard label="Users" value={summary.users} />}
          {user?.role === "ADMIN" && <SummaryCard label="Devices" value={summary.devices} />}
          <SummaryCard label="PM Plans" value={summary.pmPlans} />
        </div>
      )}
    </div>
  );
}

function SummaryCard({ className = "", label, value }) {
  return (
    <div className={`summary-card ${className}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default Dashboard;
