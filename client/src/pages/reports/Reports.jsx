import { useEffect, useMemo, useState } from "react";
import { pmPlanApi } from "../../api/pmPlanApi";
import { reportApi } from "../../api/reportApi";
import Button from "../../components/common/Button";
import ErrorMessage from "../../components/common/ErrorMessage";
import Loading from "../../components/common/Loading";
import DataTable from "../../components/table/DataTable";
import DateInput from "../../components/common/DateInput";
import { formatDate } from "../../utils/date";
import { downloadBlob } from "../../utils/download";
import { monthOptions } from "../../utils/monthOptions";
import { mergeYearOptions } from "../../utils/yearOptions";

const formatNumber = (value) => Number(value || 0).toLocaleString("en-US");
const currentYear = String(new Date().getFullYear());

const reportConfig = {
  "pm-plan": {
    label: "PM Plan",
    getData: reportApi.getPMPlan,
    exportData: reportApi.exportPMPlan,
    filePrefix: "pm-plan",
    columns: [
      { key: "no", label: "No" },
      { key: "pmPlanDate", label: "Plan Date", render: (row) => formatDate(row.pmPlanDate) },
      { key: "actualPMDate", label: "PM Date", render: (row) => formatDate(row.actualPMDate) },
      { key: "deviceGroup", label: "Group" },
      { key: "deviceType", label: "Type" },
      { key: "serialNumber", label: "SN" },
      { key: "brand", label: "Brand" },
      { key: "model", label: "Model" },
      { key: "deviceName", label: "Device" },
      { key: "zoneCode", label: "Zone" },
      { key: "displayStatus", label: "Status" },
    ],
  },
  "pm-history": {
    label: "PM Log",
    getData: reportApi.getPMHistory,
    exportData: reportApi.exportPMHistory,
    filePrefix: "pm-log",
    columns: [
      { key: "no", label: "No" },
      { key: "pmDate", label: "PM Date", render: (row) => formatDate(row.pmDate) },
      { key: "performedBy", label: "Performed By" },
      { key: "deviceGroup", label: "Group" },
      { key: "deviceType", label: "Type" },
      { key: "serialNumber", label: "SN" },
      { key: "brand", label: "Brand" },
      { key: "model", label: "Model" },
      { key: "deviceName", label: "Device" },
      { key: "zoneCode", label: "Zone" },
      { key: "cost", label: "Cost" },
    ],
  },
  "pm-cost": {
    label: "PM Cost",
    getData: reportApi.getPMCost,
    exportData: reportApi.exportPMCost,
    filePrefix: "pm-cost",
    columns: [
      { key: "no", label: "No" },
      {
        key: "equipmentGroup",
        label: "Group",
        render: (row) =>
          row.isTotal ? <strong>{row.equipmentGroup}</strong> : row.equipmentGroup,
      },
      {
        key: "totalPM",
        label: "Total PM",
        render: (row) =>
          row.isTotal ? <strong>{formatNumber(row.totalPM)}</strong> : formatNumber(row.totalPM),
      },
      {
        key: "totalCost",
        label: "Total Cost",
        render: (row) =>
          row.isTotal ? (
            <strong>{formatNumber(row.totalCost)}</strong>
          ) : (
            formatNumber(row.totalCost)
          ),
      },
    ],
  },
};

function Reports() {
  const [type, setType] = useState("pm-plan");
  const [filters, setFilters] = useState({
    year: currentYear,
    month: "",
    planStatus: "ACTIVE",
    deviceId: "",
    deviceSearch: "",
    groupId: "",
    zoneId: "",
    startDate: "",
    endDate: "",
  });
  const [rows, setRows] = useState([]);
  const [devices, setDevices] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    groups: [],
    zones: [],
  });
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [reportSummary, setReportSummary] = useState(null);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [error, setError] = useState("");

  const config = reportConfig[type];
  const params = useMemo(() => cleanParams(getReportParams(type, filters)), [filters, type]);
  const yearOptions = useMemo(
    () => mergeYearOptions([currentYear, ...availableYears, filters.year]),
    [availableYears, filters.year]
  );
  const costTotals = useMemo(() => {
    if (type !== "pm-cost") {
      return {
        totalPM: 0,
        totalCost: 0,
      };
    }

    if (reportSummary) {
      return reportSummary;
    }

    return rows.reduce(
      (totals, row) => ({
        totalPM: totals.totalPM + Number(row.totalPM || 0),
        totalCost: totals.totalCost + Number(row.totalCost || 0),
      }),
      {
        totalPM: 0,
        totalCost: 0,
      }
    );
  }, [reportSummary, rows, type]);
  const logTotals = useMemo(() => {
    if (type !== "pm-history") {
      return {
        totalRecords: 0,
        totalCost: 0,
      };
    }

    if (reportSummary) {
      return reportSummary;
    }

    return rows.reduce(
      (totals, row) => ({
        totalRecords: totals.totalRecords + 1,
        totalCost: totals.totalCost + Number(row.cost || 0),
      }),
      {
        totalRecords: 0,
        totalCost: 0,
      }
    );
  }, [reportSummary, rows, type]);
  const tableRows = rows;
  const filteredDevices = useMemo(
    () => filterDevices(devices, filters.deviceSearch),
    [devices, filters.deviceSearch]
  );

  const loadReport = async ({
    page = pagination.page,
    pageSize = pagination.pageSize,
  } = {}) => {
    setLoading(true);
    setError("");

    try {
      const result = await config.getData({
        ...params,
        paginate: true,
        page,
        pageSize,
      });
      setRows(Array.isArray(result?.data) ? result.data : []);
      setPagination(result?.pagination || {
        page: 1,
        pageSize,
        total: 0,
        totalPages: 1,
      });
      setReportSummary(result?.summary || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadReport();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [params, pagination.page, pagination.pageSize, type]);

  useEffect(() => {
    const loadDevices = async () => {
      setDeviceLoading(true);

      try {
        const data = await reportApi.getDevices();
        setDevices(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setDeviceLoading(false);
      }
    };

    loadDevices();
  }, []);

  useEffect(() => {
    const loadYears = async () => {
      try {
        const data = await pmPlanApi.getYears();
        setAvailableYears(Array.isArray(data) ? data : []);
      } catch {
        setAvailableYears([]);
      }
    };

    loadYears();
  }, []);

  useEffect(() => {
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

    loadFilterOptions();
  }, []);

  const handleExport = async () => {
    setError("");

    try {
      const exportParams = cleanParams(getReportParams(type, filters));
      const response = await config.exportData(exportParams);
      downloadBlob(response.data, buildExportFileName(config.filePrefix, exportParams));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleYearChange = (value) => {
    setFilters((current) => ({
      ...current,
      year: value,
      month: value ? current.month : "",
    }));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Reports</h2>
          <p>Filter and export PM reports</p>
        </div>
        <Button onClick={handleExport}>Export {config.label}</Button>
      </div>

      <ErrorMessage message={error} />

      <div className="panel mb-16">
        <div className="tabs">
          {Object.entries(reportConfig).map(([key, item]) => (
            <button
              className={key === type ? "tab active" : "tab"}
              key={key}
              onClick={() => {
                setType(key);
                setPagination((current) => ({ ...current, page: 1 }));
                setReportSummary(null);
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={`report-filter-grid report-filter-grid-${type}`}>
          <label className="field">
            <span>Year</span>
            <select
              value={filters.year}
              onChange={(event) => handleYearChange(event.target.value)}
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
          {type === "pm-plan" && (
            <>
              <label className="field">
                <span>Status</span>
                <select
                  value={filters.planStatus}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      planStatus: event.target.value,
                    }))
                  }
                >
                  <option value="ACTIVE">Active plans</option>
                  <option value="ALL">All status</option>
                  <option value="PENDING">PENDING</option>
                  <option value="OVERDUE">OVERDUE</option>
                  <option value="DUE_TODAY">DUE TODAY</option>
                  <option value="DONE">DONE</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </label>
              <label className="field">
                <span>Group</span>
                <select
                  value={filters.groupId}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      groupId: event.target.value,
                    }))
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
                    setFilters((current) => ({
                      ...current,
                      zoneId: event.target.value,
                    }))
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
            </>
          )}
          {type === "pm-history" && (
            <>
              <label className="field">
                <span>Device Search</span>
                <input
                  placeholder="Type device / SN / brand / model"
                  type="search"
                  value={filters.deviceSearch}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      deviceId: "",
                      deviceSearch: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Device</span>
                <select
                  disabled={deviceLoading}
                  value={filters.deviceId}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      deviceId: event.target.value,
                    }))
                  }
                >
                  <option value="">All devices</option>
                  {filteredDevices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {formatDeviceOption(device)}
                    </option>
                  ))}
                </select>
              </label>
              <DateInput
                label="Start Date"
                value={filters.startDate}
                onChange={(nextValue) =>
                  setFilters((current) => ({
                    ...current,
                    startDate: nextValue,
                  }))
                }
              />
              <DateInput
                label="End Date"
                value={filters.endDate}
                onChange={(nextValue) =>
                  setFilters((current) => ({
                    ...current,
                    endDate: nextValue,
                  }))
                }
              />
            </>
          )}
          {type === "pm-cost" && (
            <label className="field">
              <span>Group</span>
              <select
                value={filters.groupId}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    groupId: event.target.value,
                  }))
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
          )}
          <Button onClick={() => loadReport({ page: 1 })} variant="secondary">
            Filter
          </Button>
        </div>
      </div>

      {type === "pm-history" && !loading && (
        <div className="report-summary mb-16">
          <div className="report-summary-item">
            <span>Total PM Records</span>
            <strong>{formatNumber(logTotals.totalRecords)}</strong>
          </div>
          <div className="report-summary-item">
            <span>Total Cost</span>
            <strong>{formatNumber(logTotals.totalCost)} Baht</strong>
          </div>
        </div>
      )}

      {type === "pm-cost" && !loading && (
        <div className="report-summary mb-16">
          <div className="report-summary-item">
            <span>Total PM</span>
            <strong>{formatNumber(costTotals.totalPM)}</strong>
          </div>
          <div className="report-summary-item">
            <span>Total Cost</span>
            <strong>{formatNumber(costTotals.totalCost)} Baht</strong>
          </div>
        </div>
      )}

      <div className="panel">
        {loading ? (
          <Loading />
        ) : (
          <DataTable
            columns={config.columns}
            data={tableRows}
            pagination={pagination}
            onPageChange={(page) =>
              setPagination((current) => ({ ...current, page }))
            }
            onPageSizeChange={(pageSize) =>
              setPagination((current) => ({ ...current, page: 1, pageSize }))
            }
          />
        )}
      </div>
    </div>
  );
}

const cleanParams = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== ""));

const getReportParams = (type, filters) => {
  if (type === "pm-history") {
    return {
      year: filters.year,
      month: filters.month,
      deviceId: filters.deviceId,
      deviceSearch: filters.deviceId ? "" : filters.deviceSearch,
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
  }

  if (type === "pm-cost") {
    return {
      year: filters.year,
      month: filters.month,
      groupId: filters.groupId,
    };
  }

  return {
    year: filters.year,
    month: filters.month,
    statusView: filters.planStatus,
    groupId: filters.groupId,
    zoneId: filters.zoneId,
  };
};

const buildExportFileName = (prefix, params) => {
  if (params.startDate && params.endDate) {
    return `${prefix}-${params.startDate}-to-${params.endDate}.xlsx`;
  }

  if (params.year && params.month) {
    return `${prefix}-${params.year}-${String(params.month).padStart(2, "0")}.xlsx`;
  }

  if (params.year) {
    return `${prefix}-${params.year}.xlsx`;
  }

  return `${prefix}-all.xlsx`;
};

const formatDeviceOption = (device) => {
  const group = device.type?.group?.name || "-";
  const type = device.type?.name || "-";
  const brand = device.model?.brand?.name || "-";
  const model = device.model?.name || "-";
  const zone = device.zone?.code || "-";

  return `${device.deviceName} | SN: ${device.serialNumber} | ${group}/${type} | ${brand}/${model} | Zone: ${zone}`;
};

const filterDevices = (devices, search) => {
  const text = search.trim().toLowerCase();

  if (!text) {
    return devices;
  }

  return devices.filter((device) =>
    [
      device.deviceName,
      device.serialNumber,
      device.type?.group?.name,
      device.type?.name,
      device.model?.brand?.name,
      device.model?.name,
      device.zone?.code,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(text))
  );
};

export default Reports;
