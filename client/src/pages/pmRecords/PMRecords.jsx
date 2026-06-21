import { useEffect, useMemo, useState } from "react";
import { pmPlanApi } from "../../api/pmPlanApi";
import { pmRecordApi } from "../../api/pmRecordApi";
import Button from "../../components/common/Button";
import ErrorMessage from "../../components/common/ErrorMessage";
import Loading from "../../components/common/Loading";
import DataTable from "../../components/table/DataTable";
import DateInput from "../../components/common/DateInput";
import { formatDate, todayInput } from "../../utils/date";

const initialForm = {
  pmPlanId: "",
  pmDate: todayInput(),
  cost: "",
  remark: "",
};

function PMRecords() {
  const [records, setRecords] = useState([]);
  const [pendingPlans, setPendingPlans] = useState([]);
  const [planView, setPlanView] = useState("due");
  const [planSearch, setPlanSearch] = useState("");
  const [recordSearch, setRecordSearch] = useState("");
  const [useCustomCost, setUseCustomCost] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedPlan = useMemo(
    () => pendingPlans.find((plan) => String(plan.id) === String(form.pmPlanId)),
    [form.pmPlanId, pendingPlans]
  );
  const selectedPlanCost = selectedPlan?.policyCost || "";
  const visiblePendingPlans = useMemo(
    () => filterPlans(pendingPlans, planSearch),
    [pendingPlans, planSearch]
  );
  const planBuckets = useMemo(
    () => buildPlanBuckets(visiblePendingPlans, planView),
    [planView, visiblePendingPlans]
  );
  const visiblePlanCount = planBuckets.reduce(
    (count, bucket) => count + bucket.items.length,
    0
  );
  const loadData = async ({
    page = pagination.page,
    pageSize = pagination.pageSize,
  } = {}) => {
    setLoading(true);
    setError("");

    try {
      const [recordList, planList] = await Promise.all([
        pmRecordApi.getAll({
          paginate: true,
          page,
          pageSize,
          search: recordSearch.trim() || undefined,
        }),
        pmPlanApi.getAll({ status: "PENDING" }),
      ]);

      setRecords(Array.isArray(recordList?.data) ? recordList.data : []);
      setPagination(recordList?.pagination || {
        page: 1,
        pageSize,
        total: 0,
        totalPages: 1,
      });
      setPendingPlans(Array.isArray(planList) ? planList : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadData();
    }, recordSearch ? 250 : 0);

    return () => window.clearTimeout(timeoutId);
  }, [pagination.page, pagination.pageSize, recordSearch]);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePlanViewChange = (view) => {
    setPlanView(view);
    setForm((current) => ({ ...current, pmPlanId: "" }));
    setUseCustomCost(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      await pmRecordApi.create({
        pmPlanId: Number(form.pmPlanId),
        pmDate: form.pmDate,
        cost: useCustomCost && form.cost ? Number(form.cost) : undefined,
        remark: form.remark || undefined,
      });

      setForm(initialForm);
      setUseCustomCost(false);
      setNotice("PM record saved and plan marked as DONE");
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>PM Records</h2>
          <p>Record completed PM work</p>
        </div>
        <Button onClick={loadData} variant="secondary">
          Refresh
        </Button>
      </div>

      <ErrorMessage message={error} />
      {notice && <div className="success-message">{notice}</div>}

      <div className="crud-grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h3>Complete PM</h3>

          <div className="compact-tabs" aria-label="PM plan filter">
            {planViewOptions.map((option) => (
              <button
                className={planView === option.value ? "compact-tab active" : "compact-tab"}
                key={option.value}
                onClick={() => handlePlanViewChange(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="field">
            <span>Search PM Plan</span>
            <input
              placeholder="Device / SN / group / type / brand / model / zone"
              type="search"
              value={planSearch}
              onChange={(event) => setPlanSearch(event.target.value)}
            />
          </label>

          <label className="field">
            <span>PM Plan</span>
            <select
              required
              value={form.pmPlanId}
              onChange={(event) => handleChange("pmPlanId", event.target.value)}
            >
              <option value="">
                {visiblePlanCount === 0 ? "No PM plans in this view" : "Select PM Plan"}
              </option>
              {planBuckets.map((bucket) => (
                <optgroup key={bucket.key} label={bucket.label}>
                  {bucket.items.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {formatPlanOption(plan)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {selectedPlan && (
            <div className="selected-plan-summary">
              <strong>{selectedPlan.device?.deviceName || "-"}</strong>
              <span>SN: {selectedPlan.device?.serialNumber || "-"}</span>
              <span>
                Type: {selectedPlan.device?.type?.group?.name || "-"} /{" "}
                {selectedPlan.device?.type?.name || "-"}
              </span>
              <span>
                Model: {selectedPlan.device?.model?.brand?.name || "-"} /{" "}
                {selectedPlan.device?.model?.name || "-"}
              </span>
              <span>Zone: {selectedPlan.device?.zone?.code || "-"}</span>
              <span>Plan date: {formatDate(selectedPlan.planDate)}</span>
              <span>Due in: {selectedPlan.countdownLabel || "-"}</span>
              <span>
                Policy cost: {selectedPlanCost ? `${selectedPlanCost} Baht` : "Auto from policy"}
              </span>
            </div>
          )}

          <DateInput
            required
            label="PM Date"
            value={form.pmDate}
            onChange={(nextValue) => handleChange("pmDate", nextValue)}
          />

          <label className="checkbox-field">
            <input
              checked={useCustomCost}
              type="checkbox"
              onChange={(event) => {
                setUseCustomCost(event.target.checked);
                if (!event.target.checked) {
                  handleChange("cost", "");
                }
              }}
            />
            <span>Use custom cost</span>
          </label>

          {useCustomCost && (
            <label className="field">
              <span>Custom Cost</span>
              <input
                min="0"
                placeholder="Enter special cost"
                required={useCustomCost}
                step="0.01"
                type="number"
                value={form.cost}
                onChange={(event) => handleChange("cost", event.target.value)}
              />
            </label>
          )}

          <label className="field">
            <span>Remark</span>
            <textarea
              rows={3}
              value={form.remark}
              onChange={(event) => handleChange("remark", event.target.value)}
            />
          </label>

          <div className="form-actions">
            <Button disabled={submitting || !form.pmPlanId} type="submit">
              {submitting ? "Saving..." : "Complete PM"}
            </Button>
          </div>
        </form>

        <div className="panel">
          {loading ? (
            <Loading />
          ) : (
            <>
              <div className="table-toolbar">
                <label className="field table-search-field">
                  <span>Search</span>
                  <input
                    placeholder="Search device / SN / staff / remark / cost"
                    type="search"
                    value={recordSearch}
                    onChange={(event) => setRecordSearch(event.target.value)}
                  />
                </label>
              </div>
              <DataTable
                columns={[
                  {
                    key: "planDate",
                    label: "Plan Date",
                    render: (row) => formatDate(row.pmPlan?.planDate),
                  },
                  { key: "pmDate", label: "PM Date", render: (row) => formatDate(row.pmDate) },
                  { key: "device", label: "Device", render: (row) => row.device?.deviceName },
                  { key: "serialNumber", label: "SN", render: (row) => row.device?.serialNumber },
                  { key: "performedBy", label: "Performed By", render: (row) => row.user?.fullName },
                  { key: "cost", label: "Cost" },
                  { key: "remark", label: "Remark" },
                ]}
                data={records}
                pagination={pagination}
                onPageChange={(page) =>
                  setPagination((current) => ({ ...current, page }))
                }
                onPageSizeChange={(pageSize) =>
                  setPagination((current) => ({ ...current, page: 1, pageSize }))
                }
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const formatPlanOption = (plan) => {
  const planDate = formatDate(plan.planDate);
  const deviceName = plan.device?.deviceName || "-";
  const serialNumber = plan.device?.serialNumber || "-";
  const groupName = plan.device?.type?.group?.name || "-";
  const typeName = plan.device?.type?.name || "-";
  const brandName = plan.device?.model?.brand?.name || "-";
  const modelName = plan.device?.model?.name || "-";
  const zoneCode = plan.device?.zone?.code || "-";
  const dueText = plan.countdownLabel || plan.displayStatus || plan.status || "-";

  return `${planDate} | ${dueText} | ${deviceName} | SN: ${serialNumber} | ${groupName}/${typeName} | ${brandName}/${modelName} | Zone: ${zoneCode}`;
};

const planViewOptions = [
  { label: "Need PM", value: "due" },
  { label: "Overdue", value: "overdue" },
  { label: "Today", value: "today" },
  { label: "All", value: "all" },
];

const getPlanBucketKey = (plan) => {
  const daysUntilPM = Number(plan.daysUntilPM);

  if (daysUntilPM < 0) return "overdue";
  if (daysUntilPM === 0) return "today";
  if (daysUntilPM <= 7) return "upcoming";

  return "later";
};

const bucketLabels = {
  overdue: "Overdue",
  today: "Today",
  upcoming: "Upcoming 7 days",
  later: "Later",
};

const buildPlanBuckets = (plans, view) => {
  const sortedPlans = [...plans].sort(
    (a, b) => Number(a.daysUntilPM ?? 99999) - Number(b.daysUntilPM ?? 99999)
  );
  const visiblePlans = sortedPlans.filter((plan) => {
    const key = getPlanBucketKey(plan);

    if (view === "all") return true;
    if (view === "due") return ["overdue", "today", "upcoming"].includes(key);
    return key === view;
  });

  return ["overdue", "today", "upcoming", "later"]
    .map((key) => ({
      key,
      label: bucketLabels[key],
      items: visiblePlans.filter((plan) => getPlanBucketKey(plan) === key),
    }))
    .filter((bucket) => bucket.items.length > 0);
};

const getSearchText = (values) =>
  values
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).toLowerCase())
    .join(" ");

const filterPlans = (plans, search) => {
  const text = search.trim().toLowerCase();

  if (!text) return plans;

  return plans.filter((plan) =>
    getSearchText([
      plan.device?.deviceName,
      plan.device?.serialNumber,
      plan.device?.type?.group?.name,
      plan.device?.type?.name,
      plan.device?.model?.brand?.name,
      plan.device?.model?.name,
      plan.device?.zone?.code,
      plan.device?.zone?.name,
      plan.countdownLabel,
      plan.displayStatus,
      plan.status,
    ]).includes(text)
  );
};

export default PMRecords;
