import { useEffect, useState } from "react";
import { pmPlanApi } from "../../api/pmPlanApi";
import Button from "../../components/common/Button";
import ErrorMessage from "../../components/common/ErrorMessage";
import Loading from "../../components/common/Loading";
import DataTable from "../../components/table/DataTable";
import { useAuthStore } from "../../store/authStore";
import { formatDate } from "../../utils/date";
import { confirmAction } from "../../utils/sweetAlert";
import { getMonthLabel, monthOptions } from "../../utils/monthOptions";
import { getYearOptions, mergeYearOptions } from "../../utils/yearOptions";

const currentYear = String(new Date().getFullYear());
const filterYearOptions = getYearOptions();

function PMPlans() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN";
  const [plans, setPlans] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    groups: [],
    zones: [],
  });
  const [filters, setFilters] = useState({
    year: currentYear,
    month: "",
    status: "PENDING",
    groupId: "",
    zoneId: "",
    search: "",
  });
  const [generateForm, setGenerateForm] = useState({
    year: currentYear,
    month: "",
  });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [sendingAlerts, setSendingAlerts] = useState(false);
  const [undoingGenerate, setUndoingGenerate] = useState(false);
  const [lastGenerateUndo, setLastGenerateUndo] = useState({
    createdPlanIds: [],
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPlans = async ({
    page = pagination.page,
    pageSize = pagination.pageSize,
  } = {}) => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await pmPlanApi.getAll({
        ...cleanParams(filters),
        paginate: true,
        page,
        pageSize,
      });
      setPlans(Array.isArray(result?.data) ? result.data : []);
      setPagination(result?.pagination || {
        page: 1,
        pageSize,
        total: 0,
        totalPages: 1,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableYears = async () => {
    try {
      const data = await pmPlanApi.getYears();
      setAvailableYears(Array.isArray(data) ? data : []);
    } catch {
      setAvailableYears([]);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const data = await pmPlanApi.getFilterOptions();
      setFilterOptions({
        groups: Array.isArray(data.groups) ? data.groups : [],
        zones: Array.isArray(data.zones) ? data.zones : [],
      });
    } catch {
      setFilterOptions({
        groups: [],
        zones: [],
      });
    }
  };

  useEffect(() => {
    loadPlans();
    loadAvailableYears();
    loadFilterOptions();
  }, []);

  const handleGenerate = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLastGenerateUndo({ createdPlanIds: [] });

    const generateLabel = generateForm.month
      ? `${generateForm.year} / ${getMonthLabel(generateForm.month)}`
      : `${generateForm.year} / all year`;

    const confirmed = await confirmAction({
      title: "Generate PM Plan?",
      text: `${generateLabel} - ระบบจะสร้างเฉพาะรายการที่ยังไม่มี โดยจะไม่เปลี่ยนแผน CANCELLED`,
      confirmButtonText: "Generate",
    });

    if (!confirmed) return;

    try {
      const result = await pmPlanApi.generate({
        year: Number(generateForm.year),
        month: generateForm.month ? Number(generateForm.month) : undefined,
      });
      await loadPlans();
      await loadAvailableYears();
      setLastGenerateUndo({
        createdPlanIds: result.createdPlanIds || [],
      });
      setNotice(
        `Generate success: created ${result.newCreatedCount || 0}, skipped ${result.skippedCount || 0}`
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUndoGenerate = async () => {
    const affectedCount = lastGenerateUndo.createdPlanIds.length;

    if (affectedCount === 0) return;

    const confirmed = await confirmAction({
      title: "Undo last generate?",
      text: `ระบบจะลบแผนใหม่ ${lastGenerateUndo.createdPlanIds.length} รายการ เฉพาะรายการที่ยังเป็น PENDING และยังไม่มี PM Record`,
      icon: "warning",
      confirmButtonText: "Undo Generate",
      danger: true,
    });

    if (!confirmed) return;

    setUndoingGenerate(true);
    setError("");
    setNotice("");

    try {
      const result = await pmPlanApi.undoGenerate(lastGenerateUndo);
      await loadPlans();
      await loadAvailableYears();
      setLastGenerateUndo({ createdPlanIds: [] });
      setNotice(
        `Undo success: deleted ${result.deletedCount || 0}, skipped ${result.skippedCount || 0}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUndoingGenerate(false);
    }
  };

  const handleSendAlerts = async () => {
    setSendingAlerts(true);
    setError("");
    setNotice("");

    try {
      const status = await pmPlanApi.getAlertStatus();

      if (status.sentToday) {
        const confirmed = await confirmAction({
          title: "PM Alert sent today",
          text: "วันนี้มีการส่ง PM Alert ไปแล้ว ต้องการส่งซ้ำอีกครั้งหรือไม่?",
          icon: "warning",
          confirmButtonText: "Send Again",
          danger: true,
        });

        if (!confirmed) {
          return;
        }
      }

      const result = await pmPlanApi.sendAlerts();
      const channelText = formatChannelResult(result.channels);
      setNotice(`${result.message}${channelText ? ` (${channelText})` : ""}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingAlerts(false);
    }
  };

  const handleFilterYearChange = (value) => {
    setFilters((current) => ({
      ...current,
      year: value,
      month: value ? current.month : "",
    }));
  };

  const tablePlans = plans.map((plan, index) => ({
    ...plan,
    rowNo: (pagination.page - 1) * pagination.pageSize + index + 1,
  }));
  const yearOptions = mergeYearOptions([
    ...filterYearOptions,
    ...availableYears,
    filters.year,
    generateForm.year,
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>PM Plans</h2>
          <p>{isAdmin ? "Generate and monitor PM plans" : "Monitor PM plans"}</p>
        </div>
        {isAdmin && (
          <Button disabled={sendingAlerts} onClick={handleSendAlerts} variant="secondary">
            {sendingAlerts ? "Sending..." : "Send Alerts"}
          </Button>
        )}
      </div>

      <ErrorMessage message={error} />
      {notice && <div className="success-message">{notice}</div>}
      {lastGenerateUndo.createdPlanIds.length > 0 && (
        <div className="undo-generate-bar mb-16">
          <span>
            Last generate created {lastGenerateUndo.createdPlanIds.length} PM plans.
          </span>
          <Button
            disabled={undoingGenerate}
            onClick={handleUndoGenerate}
            variant="secondary"
          >
            {undoingGenerate ? "Undoing..." : "Undo Last Generate"}
          </Button>
        </div>
      )}

      {isAdmin && (
        <div className="panel mb-16">
          <h3>Generate PM Plan</h3>
          <form className="inline-form" onSubmit={handleGenerate}>
            <label className="field">
              <span>Year</span>
              <input
                required
                type="number"
                value={generateForm.year}
                onChange={(event) =>
                  setGenerateForm((current) => ({
                    ...current,
                    year: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Month</span>
              <select
                value={generateForm.month}
                onChange={(event) =>
                  setGenerateForm((current) => ({
                    ...current,
                    month: event.target.value,
                  }))
                }
              >
                <option value="">All year</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit">Generate</Button>
          </form>
        </div>
      )}

      <div className="panel">
        <div className="table-toolbar">
          <div className="inline-form">
            <label className="field">
              <span>Year</span>
              <select
                value={filters.year}
                onChange={(event) => handleFilterYearChange(event.target.value)}
              >
                <option value="">All years</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Month</span>
              <select
                disabled={!filters.year}
                value={filters.month}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, month: event.target.value }))
                }
              >
                <option value="">All months</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="">All status</option>
                <option value="PENDING">PENDING</option>
                <option value="DONE">DONE</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </label>
            <label className="field">
              <span>Group</span>
              <select
                value={filters.groupId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, groupId: event.target.value }))
                }
              >
                <option value="">All groups</option>
                {filterOptions.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Zone</span>
              <select
                value={filters.zoneId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, zoneId: event.target.value }))
                }
              >
                <option value="">All zones</option>
                {filterOptions.zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.code}
                    {zone.name ? ` - ${zone.name}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Search</span>
              <input
                placeholder="Device name / SN"
                type="search"
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
              />
            </label>
            <Button onClick={() => loadPlans({ page: 1 })} variant="secondary">
              Filter
            </Button>
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : (
          <DataTable
            columns={[
              { key: "rowNo", label: "No" },
              { key: "planDate", label: "Plan Date", render: (row) => formatDate(row.planDate) },
              { key: "countdown", label: "Due In", render: (row) => row.countdownLabel || "-" },
              { key: "group", label: "Group", render: (row) => row.device?.type?.group?.name },
              { key: "type", label: "Type", render: (row) => row.device?.type?.name },
              { key: "serialNumber", label: "SN", render: (row) => row.device?.serialNumber || "-" },
              { key: "brand", label: "Brand", render: (row) => row.device?.model?.brand?.name },
              { key: "model", label: "Model", render: (row) => row.device?.model?.name },
              { key: "device", label: "Device", render: (row) => row.device?.deviceName },
              { key: "zone", label: "Zone", render: (row) => row.device?.zone?.code },
              { key: "status", label: "Status", render: (row) => row.displayStatus || row.status },
            ]}
            data={tablePlans}
            pagination={pagination}
            onPageChange={(page) => loadPlans({ page })}
            onPageSizeChange={(pageSize) => loadPlans({ page: 1, pageSize })}
          />
        )}
      </div>
    </div>
  );
}

const cleanParams = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== ""));

const formatChannelResult = (channels = {}) =>
  Object.entries(channels)
    .map(([name, result]) => `${name}: ${result.message}`)
    .join(", ");

export default PMPlans;
